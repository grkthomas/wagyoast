import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

import * as esbuild from 'esbuild';
import * as sass from 'sass';

import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.join(projectRoot, 'wagtailyoast', 'static', 'wagtailyoast', 'src');
const distRoot = path.join(projectRoot, 'wagtailyoast', 'static', 'wagtailyoast', 'dist');

const jsOutdir = path.join(distRoot, 'js');
const cssOutdir = path.join(distRoot, 'css');
const imagesOutdir = path.join(distRoot, 'images');

async function ensureDirs() {
  await fs.mkdir(jsOutdir, { recursive: true });
  await fs.mkdir(cssOutdir, { recursive: true });
  await fs.mkdir(imagesOutdir, { recursive: true });
}

async function copySvgs() {
  const imagesSrcDir = path.join(srcRoot, 'images');

  try {
    await fs.access(imagesSrcDir);
  } catch {
    // No images folder; nothing to copy.
    return;
  }

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          return;
        }
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.svg')) {
          return;
        }

        const relativePath = path.relative(imagesSrcDir, fullPath);
        const destPath = path.join(imagesOutdir, relativePath);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(fullPath, destPath);
      })
    );
  }

  await walk(imagesSrcDir);
}

async function buildJs() {
  const plugins = [
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
    NodeModulesPolyfillPlugin(),
  ];

  const common = {
    bundle: true,
    platform: 'browser',
    target: ['es2017'],
    format: 'iife',
    minify: true,
    sourcemap: false,
    plugins,
    define: {
      'process.env.NODE_ENV': '"production"',
      global: 'globalThis',
    },
  };

  await esbuild.build({
    ...common,
    entryPoints: {
      yoastanalysis: path.join(srcRoot, 'js', 'yoastanalysis.js'),
      yoastworker: path.join(srcRoot, 'js', 'yoastworker.js'),
    },
    outdir: jsOutdir,
  });
}

async function buildCss() {
  const entry = path.join(srcRoot, 'scss', 'styles.scss');
  const result = sass.compile(entry, {
    style: 'compressed',
  });
  await fs.writeFile(path.join(cssOutdir, 'styles.css'), result.css, 'utf-8');
}

async function main() {
  await ensureDirs();
  await buildJs();
  await buildCss();
  await copySvgs();

  // eslint-disable-next-line no-console
  console.log('[wagtailyoast] Built assets into', distRoot);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[wagtailyoast] Build failed:', err);
  process.exitCode = 1;
});
