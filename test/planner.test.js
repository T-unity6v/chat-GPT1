import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData, validateData, migrateData, mergeBackup, recommendPlan, studyDays, planProgress, renameSubject, removeSubject} from '../src/model.js';
const today='2025-01-06'; // Monday
const plan=overrides=>({id:'p',title:'簿記テキスト',subject:'資格・検定',unit:'ページ',total:100,completed:20,minutesPerUnit:3,targetDate:'2025-01-10',weekdays:[1,2,3,4,5],...overrides});
const state=(p=plan())=>({...initialData(),plans:[p],availability:{date:today,minutes:30}});
const record=(units=5,overrides={})=>({id:'r',date:today,subject:'資格・検定',minutes:units*3,note:'教材学習',planId:'p',units,...overrides});
test('plan scheduling counts only available weekdays including the deadline',()=>{
 assert.equal(studyDays(plan(),today),5);
 assert.equal(studyDays(plan({targetDate:'2025-01-12',weekdays:[0,6]}),today),2);
 assert.equal(studyDays(plan({targetDate:'2025-01-05'}),today),0);
 assert.equal(studyDays(plan({targetDate:today}),today),1);
});
test('today workload respects remaining material and the time budget',()=>{
 const d=state();const task=recommendPlan(d,d.plans[0],30,today);
 assert.equal(task.target,16);assert.equal(task.units,10);assert.equal(task.minutes,30);
 const short=state(plan({total:23}));assert.equal(recommendPlan(short,short.plans[0],30,today).units,1);
 assert.equal(recommendPlan(d,d.plans[0],0,today).units,0);
 assert.equal(recommendPlan(d,d.plans[0],2,today).units,0);
 const off=state(plan({weekdays:[6,0]}));assert.equal(recommendPlan(off,off.plans[0],30,today).scheduled,false);assert.equal(recommendPlan(off,off.plans[0],30,today).units,0);
});
test('missed days recalculate work, with overdue and no-scheduled-day cases',()=>{
 const d=state();assert.equal(recommendPlan(d,d.plans[0],60,'2025-01-08').target,27);
 assert.equal(recommendPlan(d,d.plans[0],30,'2025-01-13').units,10);
 const empty=state(plan({targetDate:today,weekdays:[0]}));assert.equal(recommendPlan(empty,empty.plans[0],30,today).days,0);
});
test('completed units and edits/deletes update progress without double counting',()=>{
 const d=state(plan({total:40}));d.records=[record(4)];
 assert.equal(planProgress(d,d.plans[0]),24);const task=recommendPlan(d,d.plans[0],30,today);
 assert.equal(task.units,0);assert.equal(task.dailyRemaining,0);assert.equal(task.available,18);
 d.records[0].units=2;assert.equal(planProgress(d,d.plans[0]),22);assert.equal(recommendPlan(d,d.plans[0],30,today).units,2);
 d.records=[];assert.equal(planProgress(d,d.plans[0]),20);assert.equal(recommendPlan(d,d.plans[0],30,today).units,4);
 d.records=[record(20)];assert.equal(recommendPlan(d,d.plans[0],90,today).remaining,0);
});
test('ordinary study records also consume the daily budget across multiple plans',()=>{
 const d=state();d.records=[{id:'normal',date:today,subject:'英語',minutes:25,note:''}];
 assert.equal(recommendPlan(d,d.plans[0],30,today).units,1);
 assert.equal(recommendPlan(d,d.plans[0],30,today).minutes,3);
});
test('plan validation rejects dangling progress, over-completion and malformed data',()=>{
 assert.ok(validateData(state()));
 for(const changes of [{weekdays:[]},{weekdays:[1,1]},{weekdays:[8]},{total:0},{completed:101},{minutesPerUnit:0},{targetDate:'2025-02-30'},{title:''}])assert.equal(validateData(state(plan(changes))),false);
 assert.equal(validateData({...state(),records:[record(81)]}),false);
 assert.equal(validateData({...state(),records:[record(1,{planId:'missing'})]}),false);
 assert.equal(validateData({...state(),records:[record(0)]}),false);
});
test('legacy migration and backups preserve plans, ordered genres, progress and goal',()=>{
 const legacy={version:2,subjects:['数学','英語'],goal:25,records:[]};
 const upgraded=migrateData(legacy);assert.deepEqual(upgraded.subjects,legacy.subjects);assert.deepEqual(upgraded.plans,[]);assert.equal(upgraded.goal,25);assert.ok(validateData(upgraded));
 const d=state();d.records=[record()];const restored=mergeBackup(initialData(),JSON.parse(JSON.stringify(d)));assert.deepEqual(restored.plans,d.plans);assert.equal(planProgress(restored,restored.plans[0]),25);assert.deepEqual(mergeBackup(restored,d),restored);
 const renamed=renameSubject(d,'資格・検定','簿記');assert.equal(renamed.plans[0].subject,'簿記');assert.ok(validateData(renamed));
 const removed=removeSubject(d,'資格・検定','読書');assert.equal(removed.plans[0].subject,'読書');assert.ok(validateData(removed));
 assert.throws(()=>removeSubject({...state(),records:[]},'資格・検定'));
});
