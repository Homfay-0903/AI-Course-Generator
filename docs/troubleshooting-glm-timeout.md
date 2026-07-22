# GLM API 超时问题排查文档

## 问题概述

在 Expo API Route 中调用智谱 GLM API (`open.bigmodel.cn`) 生成完整课程时，`fetch()` 请求在 **约 60-70 秒后超时**，返回 `"Request timed out"`。但同样的请求从命令行直接使用 Node.js 调用时，可以正常完成（约 30-120 秒）。

**关键线索：** 智谱 API 控制台显示 **该 API 从未被调用过**。说明请求在网络层就超时了，TLB 连接未能成功建立或被提前关闭。

---

## 项目环境

- **项目:** AI 课程生成器 (Expo React Native)
- **Expo SDK:** ~57.0.7
- **Node.js:** v26.2.0
- **API 路由:** Expo API Routes（服务端，`web.output: "server"`）
- **AI 模型:** 智谱 GLM-4-Flash（`open.bigmodel.cn`）
- **超时设置:** 无显式 AbortController（使用默认 undici 超时）

---

## 已尝试的方案

### 方案 1：原生 fetch()（当前代码）

```typescript
const response = await fetch(GLM_API_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model: 'glm-4-flash', messages: [...], max_tokens: 4096 }),
});
```

**结果:** 失败 — `Request timed out` 在 ~60-70s 后。

从 API Route 直接 handler 中调用时，同环境下的短请求（<5s）可以正常到达 GLM 并成功返回。但长请求（>60s）会超时。

### 方案 2：Native `https` 模块

```typescript
const https = require('https');
https.request({ hostname: 'open.bigmodel.cn', path: '...', timeout: 180_000 }, ...);
```

**结果:** 失败 — 无法连接。GLM API 控制台显示 0 次调用。`require('https')` 在 Metro/Expo 打包环境中可能存在模块解析问题。

### 方案 3：异步/即发即弃（当前架构）

```typescript
// generate+api.ts
await db.update(courses).set({ status: 'generating' })...;

setTimeout(async () => {
  try {
    const generated = await generateCourseContent(desc, diff);
    // write to DB, set status 'ready'
  } catch (error) {
    // set status 'failed', store error message
  }
}, 0);

return Response.json({ status: 'generating' }, { status: 202 });
```

**结果:** 部分成功 — API 端点立即返回 202，后台进程正常运行。但后台进程中的 `fetch()` 调用仍然在 ~60-70s 后超时。状态正确更新为 `'failed'`，错误信息为 `"Request timed out"`。

### 方案 4：自定义 undici Agent（已编写，未测试）

```typescript
const undici = require('undici');
const agent = new undici.Agent({
  headersTimeout: 600_000, // 10 min
  bodyTimeout: 600_000,    // 10 min
  connectTimeout: 30_000,  // 30s for connection
});
fetch(url, { dispatcher: agent, ... });
```

**结果:** 尚未测试。此方案尝试显式覆盖 undici 的默认超时值，以解决 Node.js HTTP 客户端层面的超时问题。

---

## 根因分析

### 1. undici headersTimeout（最可能原因）

Node.js 20+ 的 `fetch()` 底层使用 undici HTTP 客户端。undici 的默认超时值为：
- `headersTimeout`: 300,000ms（5 分钟）
- `bodyTimeout`: 300,000ms（5 分钟）

但在 **Expo CLI 开发服务器**环境中，这些超时值可能被配置为更短的默认值（如 60 秒）。当 GLM 生成完整课程需要 60-120 秒时，undici 在收到响应头之前就关闭了连接。

### 2. TCP 空闲连接超时

即使 undici 允许长超时，网络中间设备（防火墙、NAT 网关、代理服务器）可能会关闭空闲的 TCP 连接。GLM API 在生成响应期间不发送任何数据，TCP 连接在此期间完全空闲。标准防火墙的 TCP idle timeout 通常在 60-120 秒之间。

**这解释了为什么：**
- 短请求（<5s）可以正常到达 GLM — 在空闲超时之前完成
- 长请求（>60s）在 GLM 完成生成之前就超时 — 由网络中间设备丢弃
- GLM API 控制台显示 0 次调用 — 连接未能成功建立

### 3. Expo 开发服务器 HTTP 超时

Expo CLI 开发服务器可能在 HTTP 层面设置了请求超时。即使后台 `setTimeout` 中的 `fetch()` 是异步的，它仍然通过 Expo 的 HTTP 代理/中间件建立连接，该代理可能对出站请求施加超时限制。

### 4. 控制台未收到调用的根本原因

GLM API 控制台显示 **零次调用**。这意味着：

- **不是 GLM 服务端超时** — 请求从未到达过 GLM 服务器
- **超时发生在客户端/网络层** — 在建立 TCP 连接或发送 HTTP 请求之前就超时了
- **可能原因：**
  a. DNS 解析成功，但 TCP 连接在 TLS 握手期间超时
  b. TCP 连接建立后，在 GLM 响应返回之前由网络中间设备关闭
  c. Node.js HTTP 客户端（undici）在达到 `headersTimeout` 时主动关闭连接

---

## 建议的解决方案（按优先级排列）

### P0：验证自定义 undici Agent（方案 4）

代码已编写，待测试。在 `glm.ts` 中显式设置 600s 的 `headersTimeout` 和 `bodyTimeout`。

**验证方法：**
```bash
# 1. 确保 Expo 开发服务器已运行
# 2. 创建一个新课程并触发生成
curl -X POST http://localhost:8081/api/courses \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"2790165595@qq.com","title":"Test","description":"Learn Python basics","difficulty":"beginner"}'

# 3. 触发生成并轮询状态
curl -X POST http://localhost:8081/api/courses/{id}/generate \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"2790165595@qq.com"}'

# 4. 每 5 秒轮询状态
curl http://localhost:8081/api/courses/{id}
```

**预期结果：** 如果 undici 超时是唯一问题，课程应在 60-120 秒后变为 `ready`。

### P1：通过 API Route 直接使用原生 `https` 连接 GLM

在 `generate+api.ts` 中直接调用 GLM API（不通过 `glm.ts`），使用 Node.js 的 `https.request()` 并设置 `timeout` 选项。

```typescript
import https from 'https';

function callGlmDirectly(prompt: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'open.bigmodel.cn',
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: { ... },
      timeout: 300_000, // 5 min
    }, (res) => { /* handle response */ });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}
```

**优点：** 绕过 undici，直接控制 socket 超时。
**缺点：** 需要手动处理 HTTPS、JSON 解析、错误处理。

### P2：使用 Server-Sent Events (SSE) 或流式传输

GLM API 支持流式响应（`stream: true`）。使用流式传输可以保持连接活跃，避免空闲超时。

```typescript
const response = await fetch(GLM_API_ENDPOINT, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ ..., stream: true }),
});
const reader = response.body.getReader();
// 持续读取流，保持连接活跃
```

**优点：** 
- 连接持续活跃，避免 TCP idle timeout
- 可以实时显示生成进度
- 获得响应时间更快（逐 token 返回）

**缺点：** 需要重构 GLM 响应解析逻辑。

### P3：部署到生产服务器（Vercel/Railway）

Expo 开发服务器可能对出站请求有特殊限制。将 API Route 部署到生产环境（Vercel）后，这些限制可能消失。

```bash
npx vercel deploy
```

**优点：** 生产环境通常没有开发服务器的限制。
**缺点：** 需要在生产环境中重现问题才能验证。

### P4：添加 TCP Keep-Alive

在 HTTP 请求中启用 TCP Keep-Alive，防止网络中间设备因空闲而关闭连接。

```typescript
const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000, // 每 30 秒发送 keep-alive 包
});
```

### P5：缩短生成时间

减少 GLM 生成内容的规模，使生成时间保持在 60 秒以内：

```typescript
// 减小 max_tokens
max_tokens: 2048,  // 而不是 4096 或 8192

// 减少课程规模
const guide = '2-3章，每章1-2节，每节300-500字';  // 而不是 4-6章/2-3节/500-800字
```

**缺点：** 课程质量会降低。

---

## 当前代码状态

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/lib/glm.ts` | 已修改 | 包含自定义 undici Agent（未测试），移除 AbortController |
| `src/app/api/courses/[id]/generate+api.ts` | 已修改 | 异步即发即弃架构，错误信息存储到 DB |
| `src/app/(tabs)/missions.tsx` | 已修改 | 轮询机制，每 5 秒查询课程状态 |

### 未提交的修改

所有上述修改均为未提交状态。建议在确定最终方案后再提交。

---

## 关键调试记录

```
时间轴:
  0s  — POST /api/courses/:id/generate → 返回 202（异步模式）
  0s  — setTimeout(fn, 0) 启动后台生成任务
  ~5s — fetch() 到 open.bigmodel.cn 开始执行
  ~60-70s — fetch() 抛出 "Request timed out"
  ~66s — 后台 catch 块设置 status='failed'

错误信息:
  "ERROR: Request timed out"

环境验证:
  - DNS 解析: ✅ (317ms, open.bigmodel.cn 可达)
  - GLM API 短请求: ✅ (882ms, 200 OK, 最小 payload)
  - GLM API 长请求: ❌ (60-70s 后超时)
  - GLM API 控制台: ❌ 显示 0 次 API 调用

已验证的环境:
  - 直接 Node.js 调用 GLM: ✅ (30-120s 成功返回)
  - Expo API Route 内短请求: ✅ (<5s 正常)
  - Expo API Route 内长请求: ❌ (>60s 超时)
  - 异步后台 setTimeout 内 fetch: ❌ (>60s 超时)
```

---

## 下一步

1. **首先测试方案 4**（自定义 undici Agent）— 代码已就绪，只需要启动服务器并测试
2. **如果方案 4 失败**，尝试方案 2（直接使用原生 `https` 模块）
3. **如果方案 2 也失败**，尝试方案 1（SSE 流式传输）— 这是最可靠的方案，因为流式传输可以保持连接活跃
4. **生产部署验证** — 在 Vercel 上测试，确任问题是否仅在 Expo 开发服务器中存在
