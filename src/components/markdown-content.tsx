import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 主题化 Markdown 渲染 — wraps react-native-markdown-display with theme
 * tokens (text colors, code block fills). Used by the lesson reader.
 * Covers the elements GLM actually produces: headings, paragraphs, lists,
 * inline code, code blocks, bold and links.
 */
export function MarkdownContent({ children }: { children: string }) {
  const theme = useTheme();

  return (
    <Markdown
      style={{
        body: { color: theme.text, fontSize: 16, lineHeight: 27 },
        heading1: {
          color: theme.text,
          fontSize: 24,
          fontWeight: '700',
          marginTop: Spacing.four,
          marginBottom: Spacing.two,
        },
        heading2: {
          color: theme.text,
          fontSize: 20,
          fontWeight: '700',
          marginTop: Spacing.four,
          marginBottom: Spacing.two,
        },
        heading3: {
          color: theme.text,
          fontSize: 17,
          fontWeight: '600',
          marginTop: Spacing.three,
          marginBottom: Spacing.one,
        },
        heading4: {
          color: theme.text,
          fontSize: 16,
          fontWeight: '600',
          marginTop: Spacing.three,
          marginBottom: Spacing.one,
        },
        paragraph: {
          marginTop: Spacing.one,
          marginBottom: Spacing.one,
        },
        strong: { color: theme.text, fontWeight: '700' },
        em: { fontStyle: 'italic' },
        link: { color: theme.primary, textDecorationLine: 'underline' },
        bullet_list: { marginVertical: Spacing.one },
        ordered_list: { marginVertical: Spacing.one },
        bullet_list_item: { marginVertical: 2 },
        ordered_list_item: { marginVertical: 2 },
        code_inline: {
          backgroundColor: theme.backgroundSelected,
          color: theme.primary,
          fontFamily: 'monospace',
          fontSize: 14,
          borderRadius: 4,
          paddingHorizontal: 4,
        },
        code_block: {
          backgroundColor: theme.backgroundSelected,
          borderRadius: Radius.sm,
          padding: Spacing.three,
          marginVertical: Spacing.two,
          fontFamily: 'monospace',
          fontSize: 13,
          lineHeight: 20,
          color: theme.text,
        },
        blockquote: {
          backgroundColor: theme.backgroundSelected,
          borderLeftWidth: 3,
          borderLeftColor: theme.primary,
          paddingHorizontal: Spacing.three,
          paddingVertical: Spacing.two,
          marginVertical: Spacing.two,
        },
        hr: {
          backgroundColor: theme.border,
          height: StyleSheet.hairlineWidth,
          marginVertical: Spacing.three,
        },
      }}
    >
      {children}
    </Markdown>
  );
}
