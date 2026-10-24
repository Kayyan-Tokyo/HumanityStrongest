const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const image=file=>'data:image/'+(file.endsWith('.png')?'png':'webp')+';base64,'+fs.readFileSync(path.join(root,file)).toString('base64');
function content(){
  return fs.readFileSync(path.join(root,'index.html'),'utf8')
    .replace(/url\('\.\/(assets\/backgrounds\/[^']+)'\)/g,(_,file)=>`url('${image(file)}')`)
    .replace(/<script src="([^"]+)" defer><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.join(root,src.split('?')[0]),'utf8')
      .replace(/\.\/(assets\/characters\/[^'"\s]+\.png)/g,(_,file)=>image(file))+'</script>');
}
async function open(page, {seed={}, storageMode='normal'}={}) {
  // Navigation/native-origin storage is restricted in this runner. Use an explicit
  // Storage-compatible fixture; product code still uses the native localStorage API.
  const setup = `<script>(()=>{
    const values=new Map(Object.entries(${JSON.stringify(seed).replace(/</g,'\\u003c')}));
    class FixtureStorage {
      getItem(key){return values.get(String(key))??null;}
      setItem(key,value){if(${JSON.stringify(storageMode)}==='full')throw new Error('full');values.set(String(key),String(value));}
      removeItem(key){values.delete(String(key));}
      clear(){values.clear();}
      key(index){return [...values.keys()][index]??null;}
      get length(){return values.size;}
    }
    window.Storage=FixtureStorage;
    Object.defineProperty(window,'localStorage',{configurable:true,get(){if(${JSON.stringify(storageMode)}==='denied')throw new Error('denied');return area;}});
    const area=new FixtureStorage();
    if(${JSON.stringify(storageMode)}==='corrupt')area.setItem('humanityStrongest.bestWinStreak.v1','NaN');
    window.__testStorageData=()=>Object.fromEntries(values);
  })();</script>`;
  await page.setContent(content().replace('<head>','<head>'+setup));
}
async function reloadFixture(page) {
  const seed=await page.evaluate(()=>__testStorageData());
  const fresh=await page.context().newPage();
  await open(fresh,{seed});await page.close();return fresh;
}
async function configure(page){
  await page.evaluate(()=>{
    const deal=HumanityMatch.deal,resolve=HumanityBattle.resolveRound,story=HumanityStory.generateStory;
    window.__winner='player';window.__draws=0;window.__stories=0;window.__deals=0;
    HumanityMatch.deal=chars=>{__deals++;return window.__match=deal([...chars].sort((a,b)=>b.name.length-a.name.length),()=>.999999);};
    HumanityBattle.resolveRound=(p,c)=>{
      __draws++;const decision=resolve(p,c,()=>__winner==='cpu'?.999999:0);
      return __winner==='draw'?Object.freeze({...decision,winner:'draw'}):decision;
    };
    HumanityStory.generateStory=result=>{__stories++;return story(result);};
  });
}
const idle=page=>page.waitForFunction(()=>document.querySelector('#hand-screen').getAttribute('aria-busy')!=='true');
module.exports={root,image,content,open,reloadFixture,configure,idle};
