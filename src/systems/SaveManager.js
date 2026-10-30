export const DEFAULT_SETTINGS = Object.freeze({master:.7,music:.22,sfx:.7,muted:false,quality:'medium',shadows:true,cameraSensitivity:1,steeringSensitivity:1,invertCamera:false,shake:true,reducedEffects:false,keys:{accelerate:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD',drift:'Space',item:'KeyE',reset:'KeyR'}});
const KEY='kart-rush-3d-v1';
export class SaveManager {
  constructor(storage=globalThis.localStorage){
    this.storage=storage;this.available=true;
    let loaded={};try{loaded=JSON.parse(storage.getItem(KEY)||'{}')||{};}catch{this.available=false;}
    this.data={settings:{...DEFAULT_SETTINGS,...loaded.settings,keys:{...DEFAULT_SETTINGS.keys,...loaded.settings?.keys}},selection:{trackId:'valley',kartId:'comet',driverId:'pip',paint:'#ef6844',accent:'#d5ff70',wheels:'sport',accessory:'none',...loaded.selection},records:loaded.records||{},coins:Number(loaded.coins)||0,wins:Number(loaded.wins)||0,unlocked:loaded.unlocked||[],gpBest:loaded.gpBest||null};
    for(const k of ['master','music','sfx'])this.data.settings[k]=Math.max(0,Math.min(1,Number(this.data.settings[k])||0));
    if(!['low','medium','high'].includes(this.data.settings.quality))this.data.settings.quality='medium';
  }
  save(){try{this.storage.setItem(KEY,JSON.stringify(this.data));this.available=true;}catch{this.available=false;}return this.available;}
  settings(value){Object.assign(this.data.settings,value);this.save();}
  selection(value){Object.assign(this.data.selection,value);this.save();}
  recordRace(trackId,result,mode){
    const record=this.data.records[trackId]||{};
    if(Number.isFinite(result.bestLap)&&result.bestLap>0)record.bestLap=Math.min(record.bestLap||Infinity,result.bestLap);
    if(result.finished&&Number.isFinite(result.time)&&result.time>0){const key=mode==='time'?'trialBest':'bestRace';record[key]=Math.min(record[key]||Infinity,result.time);}
    this.data.records[trackId]=record;
    const reward=Number(result.coins)||0;this.data.coins+=reward;
    if(mode!=='time'&&result.position===1&&result.finished)this.data.wins++;
    this.save();return reward;
  }
  recordChampionship(position,points){
    if(!this.data.gpBest||position<this.data.gpBest.position||(position===this.data.gpBest.position&&points>this.data.gpBest.points))this.data.gpBest={position,points};
    this.save();
  }
}
