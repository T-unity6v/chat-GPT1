import { SUBJECTS, dayKey, validateRecord, validateData, total, duration, weekDays, streak, initialData, migrateData, addSubject, renameSubject, removeSubject, mergeBackup, reorderSubject } from './model.js';
const $ = s => document.querySelector(s);
const KEY = 'study-note-v1';
let data = initialData(), view = 'dashboard', weekOffset = 0, filter = '', search = '', timer = null, elapsed = 0, timerSubject = SUBJECTS[0], storageBlocked = false, unreadable = false;
try { const raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); data = migrateData(parsed); } } catch { unreadable = true; }
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options = (selected, subjects = data.subjects) => subjects.map(s => `<option value="${escape(s)}"${s === selected ? ' selected' : ''}>${escape(s)}</option>`).join('');
const subjectIndex = s => Math.max(0, data.subjects.indexOf(s)) % 5;
const subjectClass = s => `subject-${subjectIndex(s)}`;
function save(next) { if (!validateData(next)) { toast('記録を保存できません。入力内容と件数の上限（10,000件）を確認してください。'); return false; } if (unreadable) { toast('保存データを読み取れません。元データ保護のため保存を停止しています。'); return false; } try { localStorage.setItem(KEY, JSON.stringify(next)); data = next; return true; } catch { storageBlocked = true; toast('保存できませんでした。ブラウザーの空き容量と保存設定を確認してください。'); return false; } }
let toastTimeout;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 4500); }
function heading(title, subtitle, action = true) { return `<div class="page-heading"><div><div class="eyebrow">A LITTLE BETTER, EVERY DAY</div><h1>${title}<span class="heading-dot">.</span></h1><p>${subtitle}</p></div>${action ? '<button class="button primary" data-add><span>＋</span> 学習を記録</button>' : ''}</div>`; }
function recordList(records, compact = false) { if (!records.length) return '<div class="empty"><span>✎</span><h3>最初の学びを、ここから。</h3><p>5分の読書も、立派な一歩。<br>「学習を記録」から今日の学びを残しましょう。</p><button class="button secondary" data-add>＋ 最初の記録をつける</button></div>'; return `<div class="record-list">${records.map(r => `<article class="record"><div class="subject-icon ${subjectClass(r.subject)}">${['Aa','⌘','✓','▤','✧'][subjectIndex(r.subject)]}</div><div class="record-body"><div><strong>${escape(r.subject)}</strong><span class="record-date">${escape(r.date.replaceAll('-', '.'))}</span></div><p>${escape(r.note || '学習おつかれさまでした。')}</p></div><strong class="record-time">${duration(r.minutes)}</strong><div class="record-actions"><button class="icon-button" data-edit="${escape(r.id)}" aria-label="記録を編集">✎</button>${compact ? '' : `<button class="icon-button" data-delete="${escape(r.id)}" aria-label="記録を削除">×</button>`}</div></article>`).join('')}</div>`; }
function dashboard() {
 const today = dayKey(), todayMinutes = total(data.records.filter(r => r.date === today)), allMinutes = total(data.records), days = new Set(data.records.map(r => r.date)).size;
 const anchor = new Date(); anchor.setDate(anchor.getDate() + weekOffset * 7); const week = weekDays(anchor), weekly = data.records.filter(r => week.includes(r.date)), byDay = week.map(d => total(weekly.filter(r => r.date === d))), max = Math.max(data.goal, ...byDay, 60), percent = Math.min(100, Math.round(todayMinutes / data.goal * 100));
 const recent = [...data.records].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0,4);
 return `${heading('おかえりなさい', '今日の学びが、未来の自分につながる。自分のペースで始めましょう。')}
 <section class="hero"><div><div class="hero-kicker"><span class="status-dot"></span> TODAY'S SMALL STEP</div><h2>学びを積み重ねて、<br>なりたい自分へ。</h2><p>大切なのは、昨日の自分より少し前へ進むこと。<br>あなたの毎日の一歩を、ここに残しましょう。</p><button class="hero-link" data-timer-focus>今日の学習をはじめる <span>↗</span></button></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-star">✳</div><div class="art-dots">· · ·<br>· · ·</div><div class="book book-back"></div><div class="book book-front"><span>one<br>step<br><em>at a time.</em></span><i></i></div><div class="art-label">GROW A LITTLE EVERY DAY</div></div></section>
 <section class="stats" aria-label="学習統計"><article class="stat"><span class="stat-icon mint">◷</span><div><p>今日の学習時間</p><strong>${duration(todayMinutes)}</strong><small>1日の目標 ${duration(data.goal)}</small></div></article><article class="stat"><span class="stat-icon peach">✧</span><div><p>これまでの学習時間</p><strong>${duration(allMinutes)}</strong><small>${data.records.length}件の学びを記録</small></div></article><article class="stat"><span class="stat-icon lavender">♧</span><div><p>連続学習日数</p><strong>${streak(data.records)}<span> 日</span></strong><small>あなたのペースで続けよう</small></div></article><article class="stat"><span class="stat-icon sand">▦</span><div><p>学習した日数</p><strong>${days}<span> 日</span></strong><small>小さな一歩の積み重ね</small></div></article></section>
 <div class="dashboard-grid"><section class="panel week-panel"><div class="panel-heading"><div><h2>今週の学習</h2><p>${week[0].replaceAll('-', '.')} — ${week[6].slice(5).replace('-', '.')}</p></div><div class="week-controls"><button class="icon-button" data-week="-1" aria-label="前の週">‹</button><button class="icon-button" data-week="1" aria-label="次の週" ${weekOffset >= 0 ? 'disabled' : ''}>›</button></div></div><div class="week-summary"><strong>${duration(total(weekly))}</strong><span>今週の合計</span><span class="chart-legend"><i></i>学習時間</span></div><div class="chart"><div class="chart-grid"><span>${Math.ceil(max)}分</span><span>${Math.round(max/2)}分</span><span>0分</span></div><div class="bars">${week.map((d,i) => `<div class="bar-column ${d === today ? 'is-today' : ''}"><div class="bar-track"><div class="bar" style="--bar-height:${byDay[i]/max*100}%" title="${d}：${duration(byDay[i])}">${byDay[i] ? `<span>${byDay[i]}</span>` : ''}</div></div><span>${['月','火','水','木','金','土','日'][i]}</span><small>${Number(d.slice(8))}</small></div>`).join('')}</div></div></section>
 <section class="panel timer-panel"><div class="panel-heading"><div><h2>ひとつのことに、集中。</h2><p>タイマーで学習を記録しましょう</p></div><span class="tiny-tag">FOCUS</span></div><label class="sr-only" for="timer-subject">タイマーの科目</label><select id="timer-subject" ${timer ? 'disabled' : ''}>${options(timerSubject)}</select><div class="timer-face"><span id="timer-display">00:00:00</span><small id="timer-status">準備ができたら、スタート</small></div><div class="timer-buttons"><button class="button primary" id="timer-toggle">${timer ? 'Ⅱ 一時停止' : elapsed ? '▶ 再開する' : '▶ 集中をはじめる'}</button><button class="button secondary" id="timer-finish" ${!elapsed && !timer ? 'disabled' : ''}>記録する</button></div><button class="text-button" id="timer-reset" ${!elapsed && !timer ? 'disabled' : ''}>リセット</button></section>
 <section class="panel recent-panel"><div class="panel-heading"><div><h2>最近の学び</h2><p>積み重ねた時間を、振り返る。</p></div><button class="text-button" data-view="records">すべて見る ↗</button></div>${recordList(recent, true)}</section>
 <section class="panel goal-panel"><div class="panel-heading"><h2>今日の目標</h2><button class="icon-button" data-view="settings" aria-label="目標を変更">↗</button></div><div class="goal-visual"><svg viewBox="0 0 160 160" aria-label="目標達成率 ${percent}%"><circle class="ring-bg" cx="80" cy="80" r="65"/><circle class="ring-progress" cx="80" cy="80" r="65" stroke-dasharray="${percent*4.084} 408.4"/><text x="80" y="79">${percent}<tspan>%</tspan></text><text class="ring-caption" x="80" y="102">今日の達成率</text></svg></div><p class="goal-caption">${duration(todayMinutes)} <span>/ ${duration(data.goal)}</span></p><p class="goal-message">${percent >= 100 ? '目標達成！今日の自分に拍手を。' : '少しずつで大丈夫。今日も一歩ずつ。'}</p></section></div>`;
}
function recordsView() { const records = [...data.records].filter(r => (!filter || r.subject === filter) && (!search || `${r.subject} ${r.note} ${r.date}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)); return `${heading('学習の記録', 'あなたが積み重ねてきた、ひとつひとつの学び。')}<section class="panel"><div class="record-filters"><label><span class="sr-only">記録を検索</span><input id="search" type="search" placeholder="メモ・科目・日付で検索" value="${escape(search)}"></label><label><span class="sr-only">科目で絞り込み</span><select id="filter"><option value="">すべての科目</option>${options(filter)}</select></label><span class="muted">${records.length}件 · ${duration(total(records))}</span></div>${recordList(records)}</section>`; }
function subjectsPanel() { return `<section class="panel subject-panel"><div class="panel-heading"><div><h2>学習ジャンル</h2><p>追加・名前変更・削除ができます（最大50件）。並び順は自動保存されます。</p></div><span class="tiny-tag">${data.subjects.length} / 50</span></div><p id="subject-sort-help" class="small muted">左の「⠿」をドラッグして順番を変更できます。スマホは指でドラッグ、キーボードは持ち手にフォーカスして↑↓で移動できます。</p><div class="subject-manager">${data.subjects.map((name, index) => `<div class="subject-row" data-subject-index="${index}"><button type="button" class="subject-drag-handle" data-subject-drag="${index}" aria-label="${escape(name)}の順番を変更" aria-describedby="subject-sort-help" ${data.subjects.length <= 1 ? 'disabled' : ''}><span aria-hidden="true">⠿</span></button><form class="subject-rename-form" data-index="${index}"><label class="sr-only" for="subject-name-${index}">${escape(name)}のジャンル名</label><input id="subject-name-${index}" name="name" value="${escape(name)}" maxlength="30" required><button class="button secondary" type="submit">名前を保存</button></form><button class="button subject-delete-button" type="button" data-subject-delete="${index}" aria-label="${escape(name)}を削除" ${data.subjects.length <= 1 ? 'disabled' : ''}>削除</button></div>`).join('')}</div><form id="subject-add-form"><label for="new-subject">新しいジャンル名</label><div class="subject-add-row"><input id="new-subject" name="name" placeholder="例：数学、英会話、簿記" maxlength="30" required ${data.subjects.length >= 50 ? 'disabled' : ''}><button class="button primary" type="submit" ${data.subjects.length >= 50 ? 'disabled' : ''}>＋ 追加する</button></div></form><p class="small muted">記録があるジャンルを削除するときは、別のジャンルへ記録を移します。学習時間やメモは消えません。ジャンルは最低1件必要です。</p><p class="form-error" id="subject-error" role="alert"></p></section>`; }
function settingsView() { return `${heading('目標と設定', '無理のない目標で、自分らしい学習習慣を。', false)}<div class="settings-grid">${subjectsPanel()}<section class="panel"><div class="panel-heading"><div><h2>1日の学習目標</h2><p>あなたの生活に合うペースを決めましょう。</p></div><span class="stat-icon mint">◎</span></div><form id="goal-form"><label>目標時間（分）<input type="number" id="goal-input" min="1" max="1440" step="1" required value="${data.goal}"></label><div class="presets">${[15,30,60,120].map(n=>`<button type="button" class="preset ${data.goal===n?'selected':''}" data-goal="${n}">${n}分</button>`).join('')}</div><button class="button primary" type="submit">目標を保存</button></form></section><section class="panel"><div class="panel-heading"><div><h2>大切な記録のバックアップ</h2><p>端末変更の前に、記録を書き出しましょう。</p></div></div><p class="settings-copy">記録はこのブラウザーだけに保存されます。サイトのデータ削除やプライベートブラウズの終了で失われることがあるため、定期的なバックアップがおすすめです。端末間の自動同期はありません。</p><div class="backup-actions"><button class="button secondary" id="export-data">↓ JSONを書き出す</button><button class="button secondary" id="import-data">↑ JSONを読み込む</button><input id="import-file" type="file" accept=".json,application/json" hidden></div><p class="small muted">読み込み時は、今ある記録を残して追加します。同じIDの記録は上書きせず、ジャンルを追加し、現在の目標を保持します。</p></section></div><section class="about-note"><span class="brand-mark">s<span>n</span></span><div><h3>自分のための学びから、はじめよう。</h3><p>Study Note v0.1 · 個人向けの最初のバージョン。無料で、広告なし。</p></div></section>`; }
function render() { if (!data.subjects.includes(timerSubject)) timerSubject = data.subjects[0]; if (filter && !data.subjects.includes(filter)) filter = ''; $('#main').innerHTML = `${unreadable ? '<div class="warning" role="alert">保存データを読み取れませんでした。元データを保護するため保存を停止しています。ブラウザーのデータを消さずに、復旧をご相談ください。</div>' : ''}${storageBlocked ? '<div class="warning">保存に失敗しています。ブラウザーの保存設定を確認してください。</div>' : ''}${view === 'dashboard' ? dashboard() : view === 'records' ? recordsView() : settingsView()}`; document.querySelectorAll('nav [data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === view); if (b.dataset.view === view) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); }); updateTimer(); }
function navigate(next) { view = next; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
const dialog = $('#record-dialog'), form = $('#record-form');
form.elements.subject.innerHTML = options();
let timerDraft = false;
function openRecord(record = null, fromTimer = false) { timerDraft = fromTimer; form.reset(); form.elements.subject.innerHTML = options(); form.elements.id.value = record?.id || ''; form.elements.date.max = dayKey(); form.elements.date.value = record?.date || dayKey(); form.elements.subject.value = record?.subject || timerSubject; form.elements.minutes.value = record?.minutes || ''; form.elements.note.value = record?.note || ''; $('#dialog-title').textContent = record?.id ? '学習記録を編集' : '学習を記録する'; $('#form-error').textContent = ''; dialog.showModal(); }
form.addEventListener('submit', e => { e.preventDefault(); const record = { id: form.elements.id.value || `${Date.now()}-${crypto.randomUUID()}`, date: form.elements.date.value, subject: form.elements.subject.value, minutes: Number(form.elements.minutes.value), note: form.elements.note.value.trim() }; if (!validateRecord(record, data.subjects)) { $('#form-error').textContent = '日付・科目・時間（1〜1440分）を確認してください。未来の学習日は指定できません。'; return; } const next = { ...data, records: [...data.records.filter(r => r.id !== record.id), record] }; if (!save(next)) return; if (timerDraft) { elapsed = 0; timer = null; } dialog.close(); render(); toast('学びを記録しました。今日も一歩、前へ。'); });
let deleteId = null;
$('#confirm-dialog').addEventListener('close', () => { if ($('#confirm-dialog').returnValue === 'delete' && deleteId) { if (save({ ...data, records: data.records.filter(r => r.id !== deleteId) })) { render(); toast('記録を削除しました。'); } } deleteId = null; });
const subjectDeleteDialog = $('#subject-delete-dialog');
let deletingSubject = null;
function subjectError(error) { const target = $('#subject-error'); if (target) target.textContent = error.message; else toast(error.message); }
function applySubjects(next, from, to) { if (!save(next)) return false; if (timerSubject === from) timerSubject = to || next.subjects[0]; if (filter === from) filter = to || ''; render(); return true; }
$('#subject-delete-form').addEventListener('submit', e => {
 e.preventDefault();
 try { const destination = $('#subject-destination').value; const next = removeSubject(data, deletingSubject, destination); if (applySubjects(next, deletingSubject, destination)) { subjectDeleteDialog.close(); toast('ジャンルを削除しました。学習記録は保持されています。'); } }
 catch (error) { $('#subject-delete-error').textContent = error.message; }
});
document.addEventListener('submit', e => {
 if (e.target.id !== 'subject-add-form' && !e.target.classList.contains('subject-rename-form')) return;
 e.preventDefault();
 try { const name = e.target.elements.name.value; if (e.target.id === 'subject-add-form') { if (applySubjects(addSubject(data, name))) toast('ジャンルを追加しました。'); }
 else { const previous = data.subjects[Number(e.target.dataset.index)]; if (applySubjects(renameSubject(data, previous, name), previous, name.trim())) toast('ジャンル名を更新しました。'); } }
 catch (error) { subjectError(error); }
});
// Pointer capture supports both mouse and touch without making text fields draggable.
let subjectDrag = null;
function persistSubjectOrder(from, to) {
 if (from === to) return;
 const name = data.subjects[from];
 const drafts = new Map([...document.querySelectorAll('.subject-rename-form')].map(f => [data.subjects[Number(f.dataset.index)], f.elements.name.value]));
 try {
  if (!save(reorderSubject(data, from, to))) return;
  render();
  document.querySelectorAll('.subject-rename-form').forEach(f => { const draft = drafts.get(data.subjects[Number(f.dataset.index)]); if (draft !== undefined) f.elements.name.value = draft; });
  document.querySelector(`[data-subject-drag="${to}"]`)?.focus({ preventScroll: true });
  toast(`「${name}」を${to + 1}番目に移動しました。`);
 } catch (error) { subjectError(error); }
}
function previewSubjectOrder() {
 const drag = subjectDrag;
 if (!drag) return;
 const list = $('.subject-manager');
 if (!list?.contains(drag.handle)) return;
 const bounds = list.getBoundingClientRect();
 drag.inside = drag.x >= bounds.left && drag.x <= bounds.right && drag.y >= bounds.top && drag.y <= bounds.bottom;
 const rows = [...list.querySelectorAll('.subject-row')];
 rows.forEach(row => row.classList.remove('subject-drop-before', 'subject-drop-after'));
 const others = rows.filter(row => row !== drag.row);
 drag.to = others.filter(row => { const rect = row.getBoundingClientRect(); return drag.y > rect.top + rect.height / 2; }).length;
 if (!drag.inside || !drag.started || drag.to === drag.from) return;
 if (drag.to < others.length) others[drag.to].classList.add('subject-drop-before');
 else others.at(-1)?.classList.add('subject-drop-after');
}
function scrollSubjectDrag() {
 const drag = subjectDrag;
 if (!drag) return;
 if (drag.started) {
  const edge = 65;
  const speed = drag.y < edge ? -Math.min(16, (edge - drag.y) / 3) : drag.y > innerHeight - edge ? Math.min(16, (drag.y - innerHeight + edge) / 3) : 0;
  if (speed) window.scrollBy(0, speed);
  previewSubjectOrder();
 }
 drag.frame = requestAnimationFrame(scrollSubjectDrag);
}
function finishSubjectDrag(commit = false) {
 const drag = subjectDrag;
 if (!drag) return;
 subjectDrag = null;
 cancelAnimationFrame(drag.frame);
 drag.row.classList.remove('is-dragging');
 document.querySelectorAll('.subject-drop-before, .subject-drop-after').forEach(row => row.classList.remove('subject-drop-before', 'subject-drop-after'));
 document.body.classList.remove('subject-sorting');
 if (drag.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
 if (commit && drag.started && drag.inside) persistSubjectOrder(drag.from, drag.to);
}
document.addEventListener('pointerdown', e => {
 const handle = e.target.closest('[data-subject-drag]');
 if (!handle || handle.disabled || e.button !== 0 || !e.isPrimary || subjectDrag) return;
 e.preventDefault();
 handle.focus({ preventScroll: true });
 subjectDrag = { handle, row: handle.closest('.subject-row'), pointerId: e.pointerId, from: Number(handle.dataset.subjectDrag), to: Number(handle.dataset.subjectDrag), x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, started: false, inside: true };
 handle.setPointerCapture(e.pointerId);
 subjectDrag.frame = requestAnimationFrame(scrollSubjectDrag);
});
document.addEventListener('pointermove', e => {
 const drag = subjectDrag;
 if (!drag || drag.pointerId !== e.pointerId) return;
 e.preventDefault();
 drag.x = e.clientX; drag.y = e.clientY;
 if (!drag.started && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 5) {
  drag.started = true; drag.row.classList.add('is-dragging'); document.body.classList.add('subject-sorting');
 }
 previewSubjectOrder();
}, { passive: false });
document.addEventListener('pointerup', e => {
 if (subjectDrag?.pointerId !== e.pointerId) return;
 subjectDrag.x = e.clientX; subjectDrag.y = e.clientY;
 previewSubjectOrder(); finishSubjectDrag(true);
});
document.addEventListener('pointercancel', e => { if (subjectDrag?.pointerId === e.pointerId) finishSubjectDrag(); });
document.addEventListener('lostpointercapture', e => { if (subjectDrag?.pointerId === e.pointerId) finishSubjectDrag(); });
window.addEventListener('blur', () => finishSubjectDrag());
document.addEventListener('keydown', e => {
 if (e.key === 'Escape' && subjectDrag) { e.preventDefault(); finishSubjectDrag(); return; }
 const handle = e.target.closest('[data-subject-drag]');
 if (!handle || handle.disabled || !['ArrowUp', 'ArrowDown'].includes(e.key) || subjectDrag) return;
 e.preventDefault();
 const from = Number(handle.dataset.subjectDrag), to = from + (e.key === 'ArrowUp' ? -1 : 1);
 if (to >= 0 && to < data.subjects.length) persistSubjectOrder(from, to);
});
document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
 if (b.hasAttribute('data-subject-delete')) {
 deletingSubject = data.subjects[Number(b.dataset.subjectDelete)];
 const count = data.records.filter(r => r.subject === deletingSubject).length;
 $('#subject-delete-description').textContent = `「${deletingSubject}」を削除します。${count ? `${count}件の学習記録は選択したジャンルへ移動します。時間とメモは残ります。` : 'このジャンルの学習記録はありません。'}`;
 $('#subject-destination').innerHTML = options(null, data.subjects.filter(s => s !== deletingSubject));
 $('#subject-destination-label').hidden = !count;
 $('#subject-delete-error').textContent = ''; subjectDeleteDialog.showModal(); return;
 }
 if (b.hasAttribute('data-subject-close')) return subjectDeleteDialog.close();
 if (b.dataset.view) return navigate(b.dataset.view);
 if (b.hasAttribute('data-add')) return openRecord();
 if (b.hasAttribute('data-close')) return dialog.close();
 if (b.dataset.edit) return openRecord(data.records.find(r => r.id === b.dataset.edit));
 if (b.dataset.delete) { deleteId = b.dataset.delete; $('#confirm-dialog').returnValue = ''; return $('#confirm-dialog').showModal(); }
 if (b.dataset.week) { weekOffset = Math.min(0, weekOffset + Number(b.dataset.week)); return render(); }
 if (b.hasAttribute('data-timer-focus')) { $('#timer-subject').scrollIntoView({ behavior: 'smooth', block: 'center' }); return $('#timer-subject').focus({preventScroll:true}); }
 if (b.dataset.goal) { $('#goal-input').value = b.dataset.goal; return; }
 if (b.id === 'timer-toggle') { if (timer) { elapsed += Date.now() - timer; timer = null; } else timer = Date.now(); render(); }
 if (b.id === 'timer-reset') { if (confirm('タイマーをリセットしますか？計測した時間は記録されません。')) { timer = null; elapsed = 0; render(); } }
 if (b.id === 'timer-finish') { if (timer) { elapsed += Date.now() - timer; timer = null; } render(); openRecord({minutes: Math.min(1440, Math.max(1, Math.round(elapsed / 60000))), subject: timerSubject}, true); }
 if (b.id === 'export-data') { const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = `study-note-${dayKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); toast('バックアップを書き出しました。'); }
 if (b.id === 'import-data') $('#import-file').click();
});
document.addEventListener('submit', e => { if (e.target.id !== 'goal-form') return; e.preventDefault(); const goal = Number($('#goal-input').value); if (Number.isInteger(goal) && goal >= 1 && goal <= 1440 && save({...data,goal})) { render(); toast('学習目標を更新しました。'); } });
document.addEventListener('input', e => { if (e.target.id === 'search') { const pos = e.target.selectionStart; search = e.target.value; render(); $('#search').focus(); if (pos !== null) $('#search').setSelectionRange(pos,pos); } });
document.addEventListener('change', async e => { if (e.target.id === 'filter') { filter = e.target.value; render(); } if (e.target.id === 'timer-subject') timerSubject = e.target.value; if (e.target.id === 'import-file') { const file = e.target.files[0]; if (!file) return; try { if (file.size > 10 * 1024 * 1024) throw Error(); const incoming = JSON.parse(await file.text()); const next = mergeBackup(data, incoming); const addedCount = next.records.length - data.records.length; if (save(next)) { render(); toast(`${addedCount}件の記録を読み込みました。`); } } catch { toast('読み込めませんでした。有効なStudy NoteのJSON（10MB以下）を選んでください。'); } e.target.value = ''; } });
function updateTimer() { if (!$('#timer-display')) return; const seconds = Math.floor((elapsed + (timer ? Date.now()-timer : 0))/1000); $('#timer-display').textContent = [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':'); $('#timer-status').textContent = timer ? '集中する時間。ひとつずつ、ゆっくり。' : elapsed ? 'ひと休み。続きはあなたのペースで。' : '準備ができたら、スタート'; }
window.addEventListener('beforeunload', e => { if (timer || elapsed) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('storage', e => { if (e.key === KEY) { if (!timer && !elapsed && !dialog.open && !subjectDeleteDialog.open && !subjectDrag) { try { const incoming = JSON.parse(e.newValue); if (validateData(incoming)) { data = migrateData(incoming); render(); } else { unreadable = true; render(); } } catch { unreadable = true; render(); } } else { unreadable = true; toast('別タブで記録が更新されました。編集中の内容やタイマーの時間を控えて再読み込みしてください。'); } } });
$('#header-date').textContent = new Intl.DateTimeFormat('ja-JP', {year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date());
render(); setInterval(updateTimer, 250);
