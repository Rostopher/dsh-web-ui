/**
 * The mobile surface's page routes: `/m` serves the standalone phone UI
 * (an independent bundle, built to lib/mobile.js by the mobile tsdown
 * entry), `/m/mobile.js` serves the bundle itself. The page talks to the
 * host exclusively through the shared /api transport (paired-device cookie
 * already crosses the api/gate fence), so no host-side data plumbing is
 * needed here — only static serving, loopback+paired-fence via the normal
 * webserver route registration.
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'

/** The standalone mobile bundle (built artifact, next to this file's own lib output). */
function mobileBundlePath(): string {
  return fileURLToPath(new URL('../lib/mobile.js', import.meta.url))
}

/** The installed katex package root (stylesheet + fonts served from disk). */
function katexRoot(): string {
  return dirname(createRequire(import.meta.url).resolve('katex/package.json'))
}

/** The mobile page shell: minimal, offline-safe, no external assets. */
function pageHtml(bundleUrl: string): string {
  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">',
    '<meta name="theme-color" content="#f3f5f9">',
    '<meta name="referrer" content="no-referrer">',
    // KaTeX math rendering (fonts resolve relative to this URL at /m/fonts/).
    '<link rel="stylesheet" href="/m/katex.css">',
    '<title>移动端远程控制</title>',
    '</head>',
    '<body>',
    '<div id="root"></div>',
    `<script type="module" src="${bundleUrl}"></script>`,
    '</body>',
    '</html>',
  ].join('')
}

/** Send a small static body with cache headers (the bundle is content-hashed by rebuild). */
function writeStatic(res: ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, {
    'content-type': `${type}; charset=utf-8`,
    'cache-control': 'no-cache',
    'referrer-policy': 'no-referrer',
  })
  res.end(body)
}

/** Send a small binary body (fonts); no charset, immutable content. */
function writeBinary(res: ServerResponse, status: number, type: string, body: Buffer): void {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-cache',
    'referrer-policy': 'no-referrer',
  })
  res.end(body)
}

/** Font MIME types served under /m/fonts/ (the set KaTeX's stylesheet references). */
const FONT_TYPES: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
}

/**
 * Build the mobile page routes.
 * @returns the two exact routes to register on webServer.
 */
export function makeMobileRoutes(): WebRoute[] {
  const handlePage = (_req: IncomingMessage, res: ServerResponse): void => {
    writeStatic(res, 200, 'text/html', pageHtml('/m/mobile.js'))
  }
  const handleBundle = async (_req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const path = mobileBundlePath()
    if (!existsSync(path)) {
      writeStatic(res, 503, 'text/plain', 'mobile bundle not built: run pnpm --filter @linxin666/dsh-remote-web-ui build')
      return
    }
    try {
      const body = await readFile(path, 'utf8')
      writeStatic(res, 200, 'text/javascript', body)
    } catch {
      writeStatic(res, 500, 'text/plain', 'failed to read the mobile bundle')
    }
  }
  const handleKatexCss = async (_req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const body = await readFile(join(katexRoot(), 'dist', 'katex.min.css'), 'utf8')
      writeStatic(res, 200, 'text/css', body)
    } catch {
      writeStatic(res, 404, 'text/plain', 'katex stylesheet not found')
    }
  }
  const handleFont = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // Prefix route: serve one font file from the katex package by bare name.
    const name = (req.url ?? '').slice('/m/fonts/'.length).split('?')[0] ?? ''
    const type = FONT_TYPES[extname(name)]
    if (!/^[\w.-]+$/.test(name) || type === undefined) {
      writeStatic(res, 404, 'text/plain', 'font not found')
      return
    }
    try {
      writeBinary(res, 200, type, await readFile(join(katexRoot(), 'dist', 'fonts', name)))
    } catch {
      writeStatic(res, 404, 'text/plain', 'font not found')
    }
  }
  return [
    { kind: 'exact', path: '/m', handler: handlePage },
    { kind: 'exact', path: '/m/mobile.js', handler: handleBundle },
    { kind: 'exact', path: '/m/katex.css', handler: handleKatexCss },
    { kind: 'prefix', path: '/m/fonts', handler: handleFont },
  ]
}
