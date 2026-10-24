import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, validDate, validateRecord, validateData, initialData, total, duration, weekDays, streak, SUBJECTS, migrateData, addSubject, renameSubject, removeSubject, mergeBackup, reorderSubject } from '../src/model.js';
const entry = overrides => ({id:'one',date:'2025-01-06',subject:'英語',minutes:30,note:'文法の復習',...overrides});
test('local date keys and real calendar dates', () => { assert.equal(dayKey(new Date(2025,0,6,0,1)),'2025-01-06'); assert.ok(validDate('2024-02-29')); assert.equal(validDate('2025-02-29'),false); assert.equal(validDate('2025-13-01'),false); assert.equal(validDate(null),false); });
test('record validation rejects invalid, future, fractional and oversized data', () => { assert.ok(validateRecord(entry())); for (const bad of [{minutes:0},{minutes:1441},{minutes:1.5},{date:'9999-01-01'},{subject:'unknown'},{id:''},{note:'x'.repeat(501)}]) assert.equal(Boolean(validateRecord(entry(bad))),false); });
test('backup validates version, IDs, records and goal', () => { assert.ok(validateData(initialData())); assert.ok(validateData({...initialData(),records:[entry()]})); for(const d of [{...initialData(),version:999},{...initialData(),goal:0},{...initialData(),records:[entry(),entry()]},{...initialData(),records:[entry({minutes:-1})]}]) assert.equal(Boolean(validateData(d)),false); });
test('totals use recorded minutes without rounding away short sessions', () => { assert.equal(total([entry(),entry({minutes:45})]),75); assert.equal(duration(75),'1時間 15分'); assert.equal(duration(60),'1時間'); assert.equal(duration(5),'5分'); assert.equal(total([]),0); });
test('weeks start on Monday, including Sunday and year transitions', () => { assert.deepEqual(weekDays(new Date(2025,0,5)),['2024-12-30','2024-12-31','2025-01-01','2025-01-02','2025-01-03','2025-01-04','2025-01-05']); });
test('streak counts unique consecutive study dates and allows today unfinished', () => { const now = new Date(2025,0,8); const records = ['2025-01-06','2025-01-07','2025-01-07'].map((date,i)=>entry({date,id:String(i)})); assert.equal(streak(records,now),2); assert.equal(streak([...records,entry({date:'2025-01-08'})],now),3); assert.equal(streak([entry({date:'2025-01-06'})],now),0); assert.equal(streak([],now),0); });

test('legacy data migrates without losing records, goals or changing the original', () => {
 const legacy = {version:1,goal:90,records:[entry()]}; const before = structuredClone(legacy);
 const migrated = migrateData(legacy);
 assert.equal(migrated.version,3); assert.deepEqual(migrated.subjects,SUBJECTS);
 assert.deepEqual(migrated.records,legacy.records); assert.equal(migrated.goal,90); assert.deepEqual(legacy,before);
 assert.ok(validateData(migrated)); assert.throws(()=>migrateData({...legacy,records:[entry({minutes:0})]}));
});
test('custom subjects can be added, validated and renamed with their records', () => {
 const d = addSubject({...initialData(),records:[entry()]},'  数学  ');
 assert.equal(d.subjects.at(-1),'数学'); assert.ok(validateRecord(entry({subject:'数学'}),d.subjects));
 const renamed = renameSubject(d,'英語','英会話');
 assert.equal(renamed.records[0].subject,'英会話'); assert.equal(renamed.records[0].minutes,30);
 assert.equal(renamed.records[0].note,'文法の復習'); assert.equal(total(renamed.records),total(d.records));
 assert.equal(d.records[0].subject,'英語'); assert.ok(validateData(renamed));
 for(const name of ['', '   ', '英語', 'x'.repeat(31)]) assert.throws(()=>addSubject(d,name));
 assert.throws(()=>renameSubject(d,'英語','数学')); assert.throws(()=>renameSubject(d,'不存在','名前'));
 assert.ok(validateData(renameSubject(d,'数学','数学')));
 assert.throws(()=>addSubject({...d,subjects:Array.from({length:50},(_,i)=>`科目${i}`)},'新規'));
});
test('removing a used subject requires a destination and retains all study history', () => {
 const d = {...initialData(),records:[entry(),entry({id:'two',subject:'読書',minutes:10})]};
 assert.throws(()=>removeSubject(d,'英語')); assert.throws(()=>removeSubject(d,'英語','英語'));
 const next = removeSubject(d,'英語','読書');
 assert.ok(!next.subjects.includes('英語')); assert.deepEqual(next.records.map(r=>r.subject),['読書','読書']);
 assert.equal(total(next.records),40); assert.equal(next.records[0].note,d.records[0].note); assert.ok(validateData(next));
 assert.ok(!removeSubject(d,'その他').subjects.includes('その他'));
 assert.throws(()=>removeSubject({...initialData(),subjects:['英語']},'英語'));
});
test('custom backups merge genres and records, preserve goals, and support old backups', () => {
 const current = {...initialData(),goal:25,records:[entry()]};
 const incoming = {...initialData(),goal:120,subjects:['数学','英語'],records:[entry({id:'math',subject:'数学'}),entry({note:'上書き不可'})]};
 const next=mergeBackup(current,incoming);
 assert.equal(next.goal,25); assert.ok(next.subjects.includes('数学')); assert.equal(next.records.length,2);
 assert.equal(next.records[0].note,'文法の復習'); assert.deepEqual(mergeBackup(next,incoming),next);
 assert.ok(validateData(mergeBackup(current,{version:1,goal:10,records:[entry({id:'legacy'})]})));
 for (const subjects of [[],['英語','英語'],[' 英語'],['x'.repeat(31)]]) assert.equal(validateData({...initialData(),subjects}),false);
 assert.equal(validateData({...initialData(),records:[entry({subject:'削除済み'})]}),false);
});

test('reordering genres preserves records, membership, and original state in both directions', () => {
 const original={...initialData(),records:[entry()]};
 const before=structuredClone(original);
 const lastFirst=reorderSubject(original,4,0);
 assert.deepEqual(lastFirst.subjects,['その他','英語','プログラミング','資格・検定','読書']);
 assert.equal(lastFirst.records,original.records); assert.equal(lastFirst.goal,original.goal);
 assert.deepEqual(reorderSubject(lastFirst,0,4),original);
 assert.deepEqual(reorderSubject(original,1,1),original);
 assert.deepEqual(original,before); assert.ok(validateData(lastFirst));
 assert.deepEqual(migrateData(JSON.parse(JSON.stringify(lastFirst))).subjects,lastFirst.subjects);
 for(const [from,to] of [[-1,0],[0,5],[5,0],[0,1.5],['0',1],[0,NaN]]) assert.throws(()=>reorderSubject(original,from,to));
});
