import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const configPath = resolve('.vercel/output/functions/_render.func/.vc-config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));

if (config.runtime === 'nodejs18.x') {
  config.runtime = 'nodejs22.x';
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}
