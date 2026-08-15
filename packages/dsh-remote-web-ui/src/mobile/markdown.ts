/**
 * Assistant-text Markdown rendering for the mobile chat: GitHub-flavored
 * Markdown plus KaTeX math (`$...$` / `$$...$$`), sanitized before injection.
 *
 * The mobile bundle is self-contained (tsdown inlines every value import),
 * so marked / marked-katex-extension / dompurify are plain imports here.
 * The KaTeX stylesheet and fonts are NOT bundled: the plugin serves them
 * from its own `/m/katex.css` and `/m/fonts/*` routes, resolved from the
 * installed katex package at runtime.
 */
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'

marked.use(markedKatex({ throwOnError: false }))
marked.setOptions({ gfm: true, breaks: true })

/**
 * Render one assistant message body to sanitized HTML.
 * @param text - raw Markdown source of the message.
 * @returns HTML safe for dangerouslySetInnerHTML (raw HTML escaped by the
 *   sanitizer, math pre-rendered to KaTeX markup).
 */
export function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false })
  return DOMPurify.sanitize(html)
}
