#!/usr/bin/env node
/**
 * Moonfeed branding asset generator.
 *
 * Usage: npm run generate:assets [-- --source "the Mooonfeed logo.png"]
 * Defaults to auto-detect a single PNG in public containing 'logo'.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

function log(msg){ console.log(`[brand-assets] ${msg}`); }

const argv = process.argv.slice(2);
let sourceArgIndex = argv.indexOf('--source');
let sourceFile = sourceArgIndex !== -1 ? argv[sourceArgIndex+1] : null;

if(!sourceFile){
  // auto-detect
  const pngs = fs.readdirSync(PUBLIC_DIR).filter(f=>/logo.*\.png$/i.test(f));
  if(pngs.length === 1){
    sourceFile = pngs[0];
  } else {
    log(`Could not auto-detect logo (found: ${pngs.join(', ')||'none'}). Pass --source <file.png>`);
    process.exit(1);
  }
}

const srcPath = path.join(PUBLIC_DIR, sourceFile);
if(!fs.existsSync(srcPath)){
  log(`Source file not found: ${srcPath}`);
  process.exit(1);
}

const tasks = [
  { out: 'favicon-16x16.png', size: 16 },
  { out: 'favicon-32x32.png', size: 32 },
  { out: 'apple-touch-icon.png', size: 180, background: '#111111' },
  { out: 'android-chrome-192x192.png', size: 192, background: '#111111' },
  { out: 'android-chrome-512x512.png', size: 512, background: '#111111' },
];

async function ensureOG(){
  const og = path.join(PUBLIC_DIR, 'og-image.png');
  if(fs.existsSync(og)) return;
  // create simple OG (1200x630) centered logo on dark bg
  const bg = {
    create: { width: 1200, height: 630, channels: 4, background: '#111111' }
  };
  const logoBuffer = await sharp(srcPath).resize(512,512,{fit:'contain'}).png().toBuffer();
  const composite = await sharp(bg).composite([{ input: logoBuffer, gravity: 'center' }]).png().toBuffer();
  await fs.promises.writeFile(og, composite);
  log('Generated og-image.png');
}

async function run(){
  log(`Source: ${sourceFile}`);
  for(const t of tasks){
    const outPath = path.join(PUBLIC_DIR, t.out);
    const pipeline = sharp(srcPath).resize(t.size, t.size, { fit: 'contain', background: t.background || { r:0,g:0,b:0,alpha:0 } });
    if(t.background){ pipeline.flatten({ background: t.background }); }
    await pipeline.png().toFile(outPath);
    log(`Generated ${t.out}`);
  }
  await ensureOG();
  // manifest presence note
  const manifest = path.join(PUBLIC_DIR, 'site.webmanifest');
  if(!fs.existsSync(manifest)){
    log('Warning: site.webmanifest missing.');
  }
  log('All done. Add/commit/push to deploy.');
}

run().catch(e=>{ console.error(e); process.exit(1); });
