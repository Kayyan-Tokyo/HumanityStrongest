const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const math=Object.create(Math);math.random=()=>{throw Error('連勝管理による乱数消費');};
const ctx=vm.createContext({window:{},Math:math});vm.runInContext(fs.readFileSync('js/streak.js','utf8'),ctx);
const {create,parseBest,STORAGE_KEY}=ctx.window.HumanityStreak;
const values=new Map(),writes=[];
const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);writes.push(value);}};
for(const bad of [null,'undefined','NaN','Infinity','-1','2.5','1e4',' 7 ','9007199254740992','{}','01'])assert.equal(parseBest(bad),0);
assert.equal(parseBest('0'),0);assert.equal(parseBest('20'),20);
const streak=create(storage),milestones=[];
for(let n=1;n<=20;n++){
  const result={winner:'player'},update=streak.record(result);
  assert.equal(update.current,n);assert.equal(update.best,n);
  assert.equal(streak.record(result),update,'同じ保存結果の再表示で加算しない');
  assert.equal(writes.length,n);
  if(update.milestone)milestones.push(update.milestone);
}
assert.deepEqual(milestones,[5,10,20]);assert.equal(values.get(STORAGE_KEY),'20');
let update=streak.record({winner:'draw'});assert.equal(update.current,20);assert.equal(update.milestone,null);
update=streak.record({winner:'cpu'});assert.equal(update.current,0);assert.equal(update.best,20);
streak.record({winner:'player'});update=streak.record({winner:'draw'});assert.equal(update.current,1);assert.equal(update.best,20);
assert.equal(create(storage).snapshot().current,0);assert.equal(create(storage).snapshot().best,20);
values.set(STORAGE_KEY,'100');update=streak.record({winner:'player'});assert.equal(update.best,100);assert.equal(values.get(STORAGE_KEY),'100');
assert.throws(()=>streak.record({winner:'unknown'}));assert.equal(streak.snapshot().current,2);
for(const broken of [undefined,{getItem(){throw Error('拒否');},setItem(){throw Error('拒否');}}, {getItem:()=>null,setItem(){throw Error('容量超過');}}]){
  const s=create(broken);s.record({winner:'player'});assert.equal(s.snapshot().current,1);assert.equal(s.snapshot().best,1);
  assert.equal(s.snapshot().storageAvailable,false);s.record({winner:'cpu'});assert.equal(s.snapshot().current,0);
}
console.log('PASS: 勝利加算/敗北リセット/引き分け維持・5/10/20達成・最高記録保存/再読込・結果の重複加算防止・壊れた値/保存拒否/容量超過・乱数ゼロ');
