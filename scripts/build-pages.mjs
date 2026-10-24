import './build-portable.mjs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
await mkdir(new URL('site/', root), { recursive: true });
await copyFile(new URL('dist/Study-Note.html', root), new URL('site/index.html', root));
await writeFile(new URL('site/.nojekyll', root), '');
console.log('Created site/index.html — ready for GitHub Pages, including project subpaths.');
