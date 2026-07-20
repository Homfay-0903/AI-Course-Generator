/**
 * GLM (智谱 AI) API wrapper for course content generation.
 *
 * Uses the OpenAI-compatible v4 chat/completions endpoint.
 * API Key is read from server-side env var GLM_API_KEY (no EXPO_PUBLIC_ prefix).
 *
 * Reference: https://docs.bigmodel.cn/cn/api/introduction
 */

const GLM_API_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_MODEL = 'glm-4-flash';
const GLM_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 1;

// ── Types ────────────────────────────────────────────────

export interface GeneratedLesson {
  title: string;
  content: string; // Markdown
}

export interface GeneratedChapter {
  title: string;
  description: string;
  lessons: GeneratedLesson[];
}

export interface GeneratedCourse {
  icon: string; // single emoji
  chapters: GeneratedChapter[];
}

// ── Prompt template ──────────────────────────────────────

function buildSystemPrompt(difficulty: string): string {
  const difficultyGuide = {
    beginner: '4-6章，每章2-3节，每节内容500-800字，语言通俗易懂，适合零基础学习者',
    intermediate: '5-7章，每章3-4节，每节内容800-1200字，内容深入全面，适合有一定基础的学习者',
    advanced: '6-8章，每章3-5节，每节内容1000-1500字，内容专业详尽，适合进阶学习者',
  };

  const guide = difficultyGuide[difficulty as keyof typeof difficultyGuide] ?? difficultyGuide.beginner;

  return `你是一个专业的课程设计师。根据用户的描述和难度级别，设计一门完整的课程。

请严格按照以下 JSON 格式输出（不要包含 \`\`\`json 代码块标记，只输出纯 JSON）：

{
  "icon": "一个最能代表这门课程的 emoji 字符",
  "chapters": [
    {
      "title": "章标题（如：第一章 基础概念入门）",
      "description": "本章简介，1-2句话概括本章学习目标",
      "lessons": [
        {
          "title": "节标题（如：1.1 初识React Native）",
          "content": "本节教学内容，Markdown格式。包含：核心概念讲解、代码示例（如适用）、关键要点总结、本节练习建议"
        }
      ]
    }
  ]
}

课程规模要求：${guide}

内容要求：
- 每节内容的 content 字段使用 Markdown 格式编写，包含标题、列表、代码块（如适用）、加粗重点
- 知识点要循序渐进，章节之间有逻辑递进关系
- 每节末尾包含 2-3 个复习要点或练习建议
- 内容必须使用中文编写，专业术语保留英文并加注中文解释

输出规则：
1. 只输出 JSON，不要任何解释、前言或后缀
2. JSON 必须可被 JSON.parse() 直接解析
3. emoji 必须是单个 emoji 字符，不要文字描述`;
}

function buildUserPrompt(description: string, difficulty: string): string {
  const difficultyLabels: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  };
  const label = difficultyLabels[difficulty] ?? difficulty;

  return `用户想学习的课程描述：${description}
难度级别：${label}

请为这个课程设计完整的章节课纲和教学内容。`;
}

// ── JSON extraction ──────────────────────────────────────

/**
 * Extract JSON from a string that may be wrapped in markdown code blocks
 * or have leading/trailing whitespace or extraneous text.
 */
function extractJson(text: string): string {
  // Try to find JSON inside ```json ... ``` blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find the outermost { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

// ── Public API ───────────────────────────────────────────

/**
 * Call the GLM API to generate a full course structure.
 *
 * @returns Parsed {@link GeneratedCourse} with icon and chapters/lessons.
 * @throws On network errors, API errors, or JSON parse failures.
 */
export async function generateCourseContent(
  description: string,
  difficulty: string,
): Promise<GeneratedCourse> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    throw new Error('GLM_API_KEY environment variable is not set');
  }

  const systemPrompt = buildSystemPrompt(difficulty);
  const userPrompt = buildUserPrompt(description, difficulty);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GLM_TIMEOUT_MS);

      const response = await fetch(GLM_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GLM_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 8192,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '(empty)');
        throw new Error(
          `GLM API returned ${response.status}: ${errorBody.slice(0, 500)}`,
        );
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };

      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error('GLM returned empty response content');
      }

      const jsonStr = extractJson(rawContent);
      const parsed = JSON.parse(jsonStr) as GeneratedCourse;

      // Validate structure
      if (!parsed.icon || typeof parsed.icon !== 'string') {
        throw new Error('Generated course is missing icon field');
      }

      if (!Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
        throw new Error('Generated course has no chapters');
      }

      for (const ch of parsed.chapters) {
        if (!ch.title || !Array.isArray(ch.lessons) || ch.lessons.length === 0) {
          throw new Error(`Chapter "${ch.title ?? 'unknown'}" has no lessons`);
        }
        for (const lesson of ch.lessons) {
          if (!lesson.title || !lesson.content) {
            throw new Error(
              `Lesson "${lesson.title ?? 'unknown'}" in chapter "${ch.title}" is missing title or content`,
            );
          }
        }
      }

      // Truncate icon to single emoji if needed
      parsed.icon = parsed.icon.trim().slice(0, 2);

      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on parse errors (the model output is the problem)
      if (lastError.message.includes('JSON') || lastError.message.includes('missing')) {
        throw lastError;
      }

      // Don't retry on auth/config errors
      if (lastError.message.includes('401') || lastError.message.includes('403')) {
        throw lastError;
      }

      // Retry on network/timeout errors
      if (attempt < MAX_RETRIES) {
        console.warn(
          `GLM API attempt ${attempt + 1} failed, retrying...`,
          lastError.message,
        );
        // Brief delay before retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastError ?? new Error('GLM API call failed after all retries');
}
