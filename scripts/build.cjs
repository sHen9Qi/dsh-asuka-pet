#!/usr/bin/env node
/**
 * Build asuka-pet standalone plugin:
 *  1. Encode the pet artwork into src/client/pet-art.generated.ts
 *  2. Concatenate src/client/ into lib/client.js bundle
 *  3. Mirror src/index.ts to lib/index.js
 */
const fs = require('node:fs')
const path = require('node:path')
const { transform } = require('lightningcss')

const HERE = __dirname
const ROOT = path.resolve(HERE, '..')
const SRC = path.join(ROOT, 'src', 'client')
const LIB = path.join(ROOT, 'lib')
const ASSETS = path.join(ROOT, 'assets')

const PACKAGE_NAME = '@dsh-external/dsh-client-ui-asuka-pet'

function read(p) { return fs.readFileSync(p, 'utf8') }
function readBuf(p) { return fs.readFileSync(p) }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }) }

function dataUri(buf, mime) {
  return `data:${mime};base64,${buf.toString('base64')}`
}

/** Generate pet-art.generated.ts from the source webp */
function writeGeneratedArt() {
  ensureDir(SRC)
  const petBuf = readBuf(path.join(ASSETS, 'asuka-pilot-pet-v1.webp'))
  const uri = dataUri(petBuf, 'image/webp')
  fs.writeFileSync(path.join(SRC, 'pet-art.generated.ts'),
    '// Auto-generated — do not edit.\n' +
    `export const ASUKA_PET_CHIBI = ${JSON.stringify(uri)}\n`)
  console.log('pet-art.generated.ts:', petBuf.length, 'B')
}

/** Compile CSS module */
function compileCss() {
  const css = read(path.join(SRC, 'asuka-pet.module.css'))
  const { code, exports: cssExports } = transform({
    filename: 'asuka-pet.module.css',
    code: Buffer.from(css),
    cssModules: { pattern: '[hash]_[local]' },
    minify: true,
  })
  const classMap = {}
  for (const [local, exp] of Object.entries(cssExports ?? {}).sort(([a], [b]) => a < b ? -1 : 1)) {
    classMap[local] = exp.name
  }
  return { cssText: code.toString(), classMap }
}

/** Strip export keyword and block comments, keep JS */
function stripExports(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.includes('@license') ? m : '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .trim()
}

/** Inline the client module — strip imports but re-inject art data */
function inlineClient() {
  const petGenerated = read(path.join(SRC, 'pet-art.generated.ts'))
  const petBlock = stripExports(petGenerated)

  let src = read(path.join(SRC, 'index.ts'))
  src = src.replace(/^import\s+['"][^'"]+['"];?$/gm, '')
  src = src.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?$/gm, '')
  src = src.replace(/^import\s+['"][^'"]+\?inline['"];?$/gm, '')
  src = src.replace(/^\s*export\s+/gm, '')
  src = src.replace(/\/\*[\s\S]*?\*\//g, m => m.includes('@license') ? m : '')
  src = src.replace(/^\s*\/\/.*$/gm, '')
  src = src.trim()

  return [petBlock, src].join('\n\n')
}

function buildClientBundle() {
  const { cssText, classMap } = compileCss()
  const moduleBody = inlineClient()

  const cssInjection = `(() => {
    if (typeof document === 'undefined') return;
    if (document.querySelector('style[data-plugin=${JSON.stringify(PACKAGE_NAME)}]')) return;
    const tag = document.createElement('style');
    tag.dataset.plugin = ${JSON.stringify(PACKAGE_NAME)};
    tag.textContent = ${JSON.stringify(cssText)};
    document.head.appendChild(tag);
  })();`

  const factory = `var module = { exports: {} };
var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
${cssInjection}
${moduleBody}
module.exports.apply = typeof apply === 'function' ? apply : (typeof module.exports.apply === 'function' ? module.exports.apply : undefined);
return module.exports;`

  const bundle = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(PACKAGE_NAME)},
  factory: (require) => {
${factory}
  }
});\n`
  ensureDir(LIB)
  fs.writeFileSync(path.join(LIB, 'client.js'), bundle)
  console.log('lib/client.js:', fs.statSync(path.join(LIB, 'client.js')).size, 'bytes')
}

function buildIndexJs() {
  ensureDir(LIB)
  fs.writeFileSync(path.join(LIB, 'index.js'),
    '// Auto-generated — mirrors src/index.ts.\n' +
    'export function apply() {}\n')
  console.log('lib/index.js:', fs.statSync(path.join(LIB, 'index.js')).size, 'bytes')
}

function main() {
  writeGeneratedArt()
  buildClientBundle()
  buildIndexJs()
}

main()
