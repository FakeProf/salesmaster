/**
 * 1) Backend als ESM-Bundle (unterstützt Top-Level-Await) → backend-bundle.mjs (ohne Punkt im Namen für Netlify).
 * 2) Server als CJS aus netlify/server-source.js, lädt Backend per import('./backend-bundle.mjs').
 * Nur server.js und backend-bundle.mjs liegen in netlify/functions/ (gültige Function-Namen).
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const functionsDir = path.join(__dirname, 'netlify', 'functions');
fs.mkdirSync(functionsDir, { recursive: true });
const backendBundle = path.join(functionsDir, 'backend-bundle.mjs');
const serverEntry = path.join(__dirname, 'netlify', 'server-source.js');
const serverOut = path.join(functionsDir, 'server.js');

async function build() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'backend', 'index.js')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: backendBundle,
    target: 'node18',
  });
  console.log('Backend bundle:', backendBundle);

  await esbuild.build({
    entryPoints: [serverEntry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: serverOut,
    target: 'node18',
    external: ['./backend-bundle.mjs'],
  });
  console.log('Server bundle:', serverOut);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
