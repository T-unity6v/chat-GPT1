export const SUBJECTS = ['英語', 'プログラミング', '資格・検定', '読書', 'その他'];
export function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function validDate(s) { if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(`${s}T12:00:00`); return !Number.isNaN(+d) && dayKey(d) === s; }
export function validateRecord(r, subjects = SUBJECTS) { return r && typeof r.id === 'string' && r.id.length > 0 && validDate(r.date) && r.date <= dayKey() && subjects.includes(r.subject) && Number.isInteger(r.minutes) && r.minutes >= 1 && r.minutes <= 1440 && typeof r.note === 'string' && r.note.length <= 500 && (r.planId === undefined && r.units === undefined || typeof r.planId === 'string' && r.planId.length > 0 && Number.isInteger(r.units) && r.units > 0 && r.units <= 100000); }
export function validSubjects(subjects) { return Array.isArray(subjects) && subjects.length >= 1 && subjects.length <= 50 && subjects.every(s => typeof s === 'string' && s.length >= 1 && s.length <= 30 && s === s.trim()) && new Set(subjects).size === subjects.length; }
export function validateData(d) { const subjects = d?.version === 1 ? SUBJECTS : d?.subjects; return Boolean(d && [1, 2, 3].includes(d.version) && validSubjects(subjects) && Array.isArray(d.records) && d.records.length <= 10000 && d.records.every(r => validateRecord(r, subjects) && (d.version === 3 || r.planId === undefined)) && new Set(d.records.map(r => r.id)).size === d.records.length && Number.isInteger(d.goal) && d.goal >= 1 && d.goal <= 1440 && (d.version !== 3 || validPlans(d))); }
export function migrateData(d) { if (!validateData(d)) throw Error('保存データの形式が正しくありません。'); return d.version < 3 ? { ...d, version: 3, subjects: d.version === 1 ? [...SUBJECTS] : d.subjects, plans: [], availability: {date: dayKey(), minutes: 30} } : d; }
function subjectName(name) { const value = typeof name === 'string' ? name.trim() : ''; if (!value || value.length > 30) throw Error('ジャンル名は1〜30文字で入力してください。'); return value; }
export function addSubject(d, name) { const value = subjectName(name); if (d.subjects.includes(value)) throw Error('同じ名前のジャンルがあります。'); if (d.subjects.length >= 50) throw Error('ジャンルは50件まで追加できます。'); return { ...d, subjects: [...d.subjects, value] }; }
export function renameSubject(d, from, name) { const value = subjectName(name); if (!d.subjects.includes(from)) throw Error('変更するジャンルが見つかりません。'); if (value !== from && d.subjects.includes(value)) throw Error('同じ名前のジャンルがあります。'); return { ...d, subjects: d.subjects.map(s => s === from ? value : s), records: d.records.map(r => r.subject === from ? { ...r, subject: value } : r), plans: d.plans?.map(p => p.subject === from ? {...p,subject:value} : p) || [] }; }
export function removeSubject(d, name, destination) { if (!d.subjects.includes(name)) throw Error('削除するジャンルが見つかりません。'); if (d.subjects.length <= 1) throw Error('ジャンルは最低1件残してください。'); if ((d.records.some(r => r.subject === name) || d.plans?.some(p => p.subject === name)) && (!d.subjects.includes(destination) || destination === name)) throw Error('記録の移動先を選んでください。'); return { ...d, subjects: d.subjects.filter(s => s !== name), records: d.records.map(r => r.subject === name ? { ...r, subject: destination } : r), plans: d.plans?.map(p => p.subject === name ? {...p,subject:destination} : p) || [] }; }
export function reorderSubject(d, from, to) {
 if (![from, to].every(i => Number.isInteger(i) && i >= 0 && i < d.subjects.length)) throw Error('並べ替える位置が正しくありません。');
 const subjects = [...d.subjects];
 const [subject] = subjects.splice(from, 1);
 subjects.splice(to, 0, subject);
 return { ...d, subjects };
}
export function mergeBackup(current, backup) { const incoming = migrateData(backup); const ids = new Set(current.records.map(r => r.id)); const planIds = new Set(current.plans.map(p => p.id)); const next = { ...current, plans: [...current.plans,...incoming.plans.filter(p => !planIds.has(p.id))], subjects: [...new Set([...current.subjects, ...incoming.subjects])], records: [...current.records, ...incoming.records.filter(r => !ids.has(r.id))] }; if (!validateData(next)) throw Error('読み込めません。記録は10,000件、ジャンルは50件までです。'); return next; }
export function total(records) { return records.reduce((n, r) => n + r.minutes, 0); }
export function duration(m) { return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? ` ${m % 60}分` : ''}` : `${m}分`; }
export function weekDays(anchor = new Date()) { const d = new Date(anchor); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return Array.from({ length: 7 }, (_, i) => { const day = new Date(d); day.setDate(d.getDate() + i); return dayKey(day); }); }
export function streak(records, today = new Date()) { const dates = new Set(records.map(r => r.date)); const d = new Date(today); d.setHours(12, 0, 0, 0); if (!dates.has(dayKey(d))) d.setDate(d.getDate() - 1); let count = 0; while (dates.has(dayKey(d))) { count++; d.setDate(d.getDate() - 1); } return count; }
export function initialData() { return { version: 3, goal: 60, subjects: [...SUBJECTS], records: [], plans: [], availability: {date:dayKey(),minutes:30} }; }

export function planProgress(d, plan) { return plan.completed + d.records.filter(r => r.planId === plan.id).reduce((n,r) => n + r.units, 0); }
export function validPlans(d) {
 return Array.isArray(d.plans) && d.plans.length <= 30 && new Set(d.plans.map(p => p?.id)).size === d.plans.length && d.plans.every(p => p && typeof p.id === 'string' && p.id.length > 0 && typeof p.title === 'string' && p.title.trim().length > 0 && p.title.length <= 60 && d.subjects.includes(p.subject) && ['ページ','問','レッスン'].includes(p.unit) && Number.isInteger(p.total) && p.total > 0 && p.total <= 100000 && Number.isInteger(p.completed) && p.completed >= 0 && p.completed <= p.total && Number.isInteger(p.minutesPerUnit) && p.minutesPerUnit >= 1 && p.minutesPerUnit <= 120 && validDate(p.targetDate) && Array.isArray(p.weekdays) && p.weekdays.length >= 1 && p.weekdays.length <= 7 && new Set(p.weekdays).size === p.weekdays.length && p.weekdays.every(n => Number.isInteger(n) && n >= 0 && n <= 6) && planProgress(d,p) <= p.total) && d.records.every(r => !r.planId || d.plans.some(p => p.id === r.planId)) && d.availability && validDate(d.availability.date) && Number.isInteger(d.availability.minutes) && d.availability.minutes >= 0 && d.availability.minutes <= 1440;
}
export function studyDays(plan, today = dayKey()) {
 const start = new Date(today+'T12:00:00Z'), end = new Date(plan.targetDate+'T12:00:00Z');
 const days = Math.max(0,Math.round((end-start)/86400000)+1);
 let count = Math.floor(days/7)*plan.weekdays.length;
 for(let i=0;i<days%7;i++) if(plan.weekdays.includes((start.getUTCDay()+i)%7)) count++;
 return count;
}
export function recommendPlan(d, plan, budget, today = dayKey()) {
 const progress = planProgress(d,plan), remaining = plan.total-progress, days = studyDays(plan,today);
 const studied = total(d.records.filter(r => r.date === today)), available = Math.max(0,budget-studied);
 const completedToday = d.records.filter(r=>r.planId===plan.id && r.date===today).reduce((n,r)=>n+r.units,0);
 const target = remaining ? Math.ceil((remaining+completedToday)/Math.max(1,days)) : 0;
 const dailyRemaining = Math.max(0,target-completedToday);
 const scheduled = plan.weekdays.includes(new Date(today+'T12:00:00Z').getUTCDay());
 const units = scheduled ? Math.min(remaining,dailyRemaining,Math.floor(available/plan.minutesPerUnit)) : 0;
 return {progress,remaining,days,studied,available,target,scheduled,completedToday,dailyRemaining,units,minutes:units*plan.minutesPerUnit,requiredMinutes:target*plan.minutesPerUnit};
}
