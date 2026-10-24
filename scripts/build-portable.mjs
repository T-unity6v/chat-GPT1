import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
let html = await read('index.html');
const css = await read('src/style.css');
const model = (await read('src/model.js')).replace(/^export /gm, '');
const app = (await read('src/app.js')).replace(/^import .*?;\n/, '');
const icon = Buffer.from(await read('src/favicon.svg')).toString('base64');
html = html.replace('href="/src/favicon.svg"', `href="data:image/svg+xml;base64,${icon}"`)
 .replace('<link rel="stylesheet" href="/src/style.css">', `<style>${css}</style>`)
 .replace('<script type="module" src="/src/app.js"></script>', '')
 .replace('href="/"', 'href="#"')
 .replace('</body>', `<script>\n(() => {\n${model}\n${app}\n})();\n</script></body>`);
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/Study-Note.html', root), html);
await mkdir(new URL('portable/', root), { recursive: true });
await writeFile(new URL('portable/Study-Note.html', root), html);
console.log('Created portable/Study-Note.html and dist/Study-Note.html — self-contained, opens without a server.');
