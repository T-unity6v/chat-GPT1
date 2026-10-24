import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test('Pages build packages only the self-contained website for a project subpath', async () => {
  const root = new URL('../', import.meta.url);
  execFileSync(process.execPath, ['scripts/build-pages.mjs'], { cwd: root });
  const html = await readFile(new URL('site/index.html', root), 'utf8');
  const portable = await readFile(new URL('portable/Study-Note.html', root), 'utf8');
  assert.equal(html, portable);
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<style>/);
  assert.match(html, /<script>/);
  assert.doesNotMatch(html, /(?:src|href)="\//);
  assert.doesNotMatch(html, /<script[^>]*src=/);
  assert.match(html, /study-note-v1/);
  assert.equal(await readFile(new URL('site/.nojekyll', root), 'utf8'), '');
});
