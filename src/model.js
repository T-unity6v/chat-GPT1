export const SUBJECTS = ['英語', 'プログラミング', '資格・検定', '読書', 'その他'];
export function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function validDate(s) { if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(`${s}T12:00:00`); return !Number.isNaN(+d) && dayKey(d) === s; }
export function validateRecord(r) { return r && typeof r.id === 'string' && r.id.length > 0 && validDate(r.date) && r.date <= dayKey() && SUBJECTS.includes(r.subject) && Number.isInteger(r.minutes) && r.minutes >= 1 && r.minutes <= 1440 && typeof r.note === 'string' && r.note.length <= 500; }
export function validateData(d) { return d && d.version === 1 && Array.isArray(d.records) && d.records.length <= 10000 && d.records.every(validateRecord) && new Set(d.records.map(r => r.id)).size === d.records.length && Number.isInteger(d.goal) && d.goal >= 1 && d.goal <= 1440; }
export function total(records) { return records.reduce((n, r) => n + r.minutes, 0); }
export function duration(m) { return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? ` ${m % 60}分` : ''}` : `${m}分`; }
export function weekDays(anchor = new Date()) { const d = new Date(anchor); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return Array.from({ length: 7 }, (_, i) => { const day = new Date(d); day.setDate(d.getDate() + i); return dayKey(day); }); }
export function streak(records, today = new Date()) { const dates = new Set(records.map(r => r.date)); const d = new Date(today); d.setHours(12, 0, 0, 0); if (!dates.has(dayKey(d))) d.setDate(d.getDate() - 1); let count = 0; while (dates.has(dayKey(d))) { count++; d.setDate(d.getDate() - 1); } return count; }
export function initialData() { return { version: 1, goal: 60, records: [] }; }
