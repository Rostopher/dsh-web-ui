// @vitest-environment jsdom
/** renderMarkdown: GFM + KaTeX rendering with sanitizer guarantees. */
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown.ts'

describe('renderMarkdown', () => {
  it('renders GFM constructs (headings, bold, tables, code blocks)', () => {
    const html = renderMarkdown('## 标题\n\n**加粗**\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```js\nconst x = 1\n```')
    expect(html).toContain('<h2>')
    expect(html).toContain('<strong>加粗</strong>')
    expect(html).toContain('<table>')
    expect(html).toContain('<code')
  })

  it('renders inline and display math through KaTeX', () => {
    expect(renderMarkdown('质能方程 $E = mc^2$ 成立')).toContain('class="katex"')
    // CJK-adjacent delimiters (no whitespace boundaries) must also parse.
    expect(renderMarkdown('行内公式：$E=mc^2$。')).toContain('class="katex"')
    expect(renderMarkdown('$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$')).toContain('katex-display')
  })

  it('keeps a broken formula as literal source instead of throwing', () => {
    // throwOnError: false — KaTeX renders the offending source in place.
    expect(renderMarkdown('$\\notacommandatall{x}$')).toContain('notacommandatall')
  })

  it('escapes raw HTML and strips dangerous URLs', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).not.toContain('<script>')
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript:')
  })
})
