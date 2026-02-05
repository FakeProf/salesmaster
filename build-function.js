/**
 * Backend und Server zu einem einzigen CJS-Bundle bündeln (kein Top-Level-Await mehr).
 * Netlify kann dann mit node_bundler = "none" deployen - alles in einer Datei.
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const functionsDir = path.join(__dirname, 'netlify', 'functions');
fs.mkdirSync(functionsDir, { recursive: true });
const serverEntry = path.join(__dirname, 'netlify', 'server-source.js');
const serverOut = path.join(functionsDir, 'server.js');

async function build() {
  // Backend direkt in server.js einbinden (kein separater Import mehr)
  await esbuild.build({
    entryPoints: [serverEntry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: serverOut,
    target: 'node18',
    // Backend wird automatisch eingebunden, da server-source.js es importiert
    external: [], // Alles bündeln
  });
  console.log('Server bundle (inkl. Backend):', serverOut);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
