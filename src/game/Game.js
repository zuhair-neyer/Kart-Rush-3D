import {SceneManager} from '../scene/SceneManager.js';
import {RaceManager} from './RaceManager.js';
import {createRoute,TRACKS} from '../tracks/TrackData.js';
import {KARTS} from '../vehicles/KartCatalog.js';
import {SaveManager} from '../systems/SaveManager.js';
import {InputManager} from '../systems/InputManager.js';
import {AudioManager} from '../systems/AudioManager.js';
import {UI} from '../ui/UI.js';

const STEP=1/60;
const ITEM_NAMES={boost:'Boost Orb',oil:'Oil Slick',shield:'Shield',pulse:'Pulse Blast',spark:'Homing Spark',ghost:'Ghost Mode'};
export class Game {
  constructor(){
    this.saveManager=new SaveManager();this.save=this.saveManager.data;this.settings=this.save.settings;this.state='menu';this.paused=false;this.race=null;this.gp=null;this.time=0;this.accumulator=0;this.hudClock=0;this.loadVersion=0;this.countdownUntil=0;this.reportedResults=false;this.lastFrame=performance.now();this.pending={item:false,reset:false};
    this.canvas=document.getElementById('game-canvas');this.scene=new SceneManager(this.canvas,this.settings);this.audio=new AudioManager(this.settings);
    const callbacks={startRace:config=>this.startRace(config),previewTrack:id=>this.previewTrack(id),previewKart:(id,c)=>this.scene.previewKart(id,c),rotatePreview:delta=>this.scene.rotatePreview(delta),pause:()=>this.pause(),resume:()=>this.resume(),restart:()=>this.restart(),quit:()=>this.quit(),settingsChanged:s=>this.applySettings(s),selectionChanged:s=>this.saveManager.selection(s),fullscreen:()=>this.fullscreen(),continueGP:()=>this.continueGP(),navigate:s=>this.navigate(s)};
    this.ui=new UI({root:document.getElementById('app'),callbacks,save:this.save});
    this.input=new InputManager(this.settings,()=>this.togglePause(),()=>this.audio.unlock());
    document.addEventListener('click',e=>{if(e.target.closest('button'))this.audio.play('menu');});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(this.state==='race'&&!this.paused)this.pause();this.audio.setPaused(true);}else if(!this.paused)this.audio.setPaused(false);});
    window.addEventListener('blur',()=>{if(this.state==='race'&&!this.paused)this.pause();});
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.state==='race')this.pause();this.ui.notify('Graphics context lost. Waiting for the browser to recover…','warning');});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.scene.applySettings();this.ui.notify('Graphics restored. Resume when ready.');});
    this.previewTrack(this.save.selection.trackId);this.ui.showMenu();
    if(!this.saveManager.available)this.ui.notify('Local saving is unavailable in this browser. You can still race.','warning');
    this.frame=this.frame.bind(this);this.frameId=requestAnimationFrame(this.frame);
    if(import.meta.env.DEV)window.__kartRush=this;
  }
  navigate(screen){
    if(this.state==='race'||this.state==='results'||this.state==='loading')return;
    if(screen==='garage'){this.scene.setView('garage');this.scene.previewKart(this.save.selection.kartId,this.save.selection);}
    else if(this.scene.view!=='menu')this.scene.setView('menu');
  }
  previewTrack(id){if(this.state==='race')return;const track=TRACKS.find(t=>t.id===id)||TRACKS[0];if(this.scene.route?.id!==track.id)this.scene.setRoute(createRoute(track.id));}
  async startRace(config,continuation=false){
    const version=++this.loadVersion;
    const kart=KARTS.find(k=>k.id===config.kartId)||KARTS[0];if((kart.unlockWins||0)>this.save.wins){this.ui.notify(`Win ${kart.unlockWins} races to unlock ${kart.name}.`,'warning');return;}
    const mode=['quick','gp','time'].includes(config.mode)?config.mode:'quick';
    config={mode,trackId:config.trackId||this.save.selection.trackId,kartId:kart.id,difficulty:config.difficulty||'normal',laps:Math.max(1,Math.min(9,Number(config.laps)||3)),customization:{...this.save.selection,...config.customization}};
    if(mode==='gp'&&!continuation){this.gp={round:0,points:new Map(),stage:'racing',config:{...config}};config.trackId=TRACKS[0].id;}else if(mode!=='gp')this.gp=null;
    this.config=config;this.saveManager.selection({...config.customization,trackId:config.trackId,kartId:config.kartId});
    this.state='loading';this.paused=false;this.input.setActive(false);this.audio.setPaused(false);this.audio.unlock();this.audio.stopEngine();this.ui.showLoading(.15,'Preparing the starting grid');
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(version!==this.loadVersion)return;
    try{
      const route=createRoute(config.trackId);this.scene.setRoute(route);this.ui.showLoading(.65,'Tuning karts & placing rivals');
      await new Promise(resolve=>requestAnimationFrame(resolve));if(version!==this.loadVersion)return;
      this.race=new RaceManager({...config,route});this.race.steeringSensitivity=this.settings.steeringSensitivity;this.scene.setRace(this.race,config.customization);this.reportedResults=false;this.countdownUntil=0;this.accumulator=0;this.state='race';this.input.setActive(true);this.ui.showHUD(config);this.ui.updateHUD(this.race);this.handleEvents();
    }catch(error){console.error(error);this.state='menu';this.ui.showMenu();this.ui.notify('The race could not load: '+error.message,'warning');}
  }
  applySettings(settings){const oldQuality=this.settings.quality;this.saveManager.settings(settings);this.input.settings=this.settings;this.audio.settings=this.settings;this.audio.applySettings();this.scene.applySettings();if(oldQuality!==this.settings.quality&&this.scene.world){const route=this.scene.route;this.scene.world.dispose();this.scene.world=new this.scene.world.constructor(this.scene.scene,route,this.settings.quality);this.scene.world.group.visible=this.scene.view!=='garage';}if(this.race)this.race.steeringSensitivity=this.settings.steeringSensitivity;}
  togglePause(){if(this.state!=='race')return;this.paused?this.resume():this.pause();}
  pause(){if(this.state!=='race'||this.paused)return;this.paused=true;this.input.setActive(false);this.audio.setPaused(true);this.ui.showPause();}
  resume(){if(this.state!=='race')return;this.paused=false;this.accumulator=0;this.input.setActive(true);this.audio.setPaused(false);this.ui.showHUD(this.config);this.ui.updateHUD(this.race);if(this.race.state==='countdown')this.ui.setCountdown(this.race.countdown||'GO!');}
  restart(){if(!this.config)return;if(this.gp&&this.reportedResults){this.ui.notify('This championship race is scored. Continue the cup or start a new one.');return;}this.startRace({...this.config},!!this.gp);}
  quit(){this.loadVersion++;this.race=null;this.state='menu';this.paused=false;this.gp=null;this.input.setActive(false);this.audio.setPaused(false);this.audio.stopEngine();this.scene.clearRacers();this.scene.makeDemoRacers();this.scene.setView('menu');this.ui.showMenu();}
  fullscreen(){const promise=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();promise?.catch(()=>this.ui.notify('Fullscreen is unavailable in this browser.','warning'));}
  handleEvents(){
    if(!this.race)return;for(const event of this.race.consumeEvents()){
      this.scene.event(event,this.race);const personal=!event.racerId||event.racerId===this.race.player.id;if(!personal)continue;
      this.audio.play(event.type,event.value);
      switch(event.type){
        case 'countdown':this.ui.setCountdown(event.value);break;
        case 'go':this.ui.setCountdown('GO!');this.countdownUntil=this.time+1.05;this.ui.notify(this.config.mode==='time'?'Just you and the clock. Make it count.':'Find your line. Let’s race!');break;
        case 'lap':this.ui.notify(`Lap ${this.race.player.completedLaps} complete · ${formatTime(event.time)}${this.race.player.lap===this.race.laps?' · FINAL LAP':''}`);break;
        case 'boost':this.ui.notify(event.level>=3?'SUPER BOOST':'BOOST!','boost');break;
        case 'itemPickup':this.ui.notify(`${ITEM_NAMES[event.item]} ready · press ${keyLabel(this.settings.keys.item)}`);break;
        case 'itemUse':this.ui.notify(`${ITEM_NAMES[event.item]} activated`);break;
        case 'warning':this.ui.notify(event.message||'Homing spark incoming!','warning');break;
        case 'notice':this.ui.notify(event.message);break;
        case 'reset':this.ui.notify('Recovering to your last checkpoint · 1.8s penalty','warning');break;
        case 'position':if(event.position<event.previous)this.ui.notify(`${ordinal(event.position)} place. Keep it going!`);break;
        case 'finish':this.ui.setCountdown('FINISH!');this.countdownUntil=this.time+2.6;this.ui.notify('Race complete! Waiting for the remaining racers.');this.input.setActive(false);break;
        case 'results':this.finishRace();break;
      }
    }
  }
  finishRace(){
    if(this.reportedResults)return;this.reportedResults=true;this.state='results';this.input.setActive(false);this.audio.stopEngine();this.ui.hideCountdown();
    const results=this.race.getResults(),player=results.find(r=>r.isPlayer),wins=this.save.wins;const reward=this.saveManager.recordRace(this.config.trackId,player,this.config.mode);
    for(const k of KARTS)if(k.unlockWins>wins&&k.unlockWins<=this.save.wins&&!this.save.unlocked.includes(k.id)){this.save.unlocked.push(k.id);this.ui.notify(`${k.name} unlocked in the garage!`);}
    this.saveManager.save();
    if(this.gp){const points=[15,12,10,8,6,4];for(const result of results){const previous=this.gp.points.get(result.id)||{id:result.id,name:result.name,isPlayer:result.isPlayer,points:0};previous.points+=points[result.position-1]||0;this.gp.points.set(result.id,previous);}this.gp.stage='results';}
    this.ui.showResults(results,{mode:this.config.mode,trackId:this.config.trackId,laps:this.config.laps,bestLap:player.bestLap,reward,gpRound:this.gp?this.gp.round+1:undefined});
  }
  continueGP(){
    if(!this.gp){this.quit();return;}
    if(this.gp.stage==='results'){
      this.gp.stage='standings';const standings=[...this.gp.points.values()].sort((a,b)=>b.points-a.points||a.id.localeCompare(b.id));const final=this.gp.round===3;
      if(final){const index=standings.findIndex(r=>r.isPlayer);this.saveManager.recordChampionship(index+1,standings[index].points);}
      this.ui.showGP(standings,final);return;
    }
    if(this.gp.round>=3){this.quit();return;}
    this.gp.round++;this.gp.stage='racing';this.startRace({...this.gp.config,trackId:TRACKS[this.gp.round].id},true);
  }
  frame(now){
    this.frameId=requestAnimationFrame(this.frame);const dt=Math.min((now-this.lastFrame)/1000,.1);this.lastFrame=now;this.time+=dt;
    try{
      const input=this.input.read();this.pending.item||=input.item;this.pending.reset||=input.reset;
      if(this.state==='race'&&!this.paused){this.accumulator+=dt;let steps=0;while(this.accumulator>=STEP&&steps++<6){this.race.update(STEP,{...input,item:this.pending.item,reset:this.pending.reset});this.pending.item=false;this.pending.reset=false;this.accumulator-=STEP;}this.handleEvents();this.hudClock+=dt;if(this.hudClock>.066&&this.state==='race'){this.hudClock=0;this.ui.updateHUD(this.race);}}
      else{this.pending.item=false;this.pending.reset=false;}
      if(this.countdownUntil&&this.time>this.countdownUntil){this.ui.hideCountdown();this.countdownUntil=0;}
      this.scene.update(dt,this.time,this.race,this.paused||this.state==='results');if(!this.paused)this.audio.update(dt,this.race?.player,this.state==='race'&&this.race.state!=='countdown');
    }catch(error){cancelAnimationFrame(this.frameId);console.error(error);this.input.setActive(false);this.ui.notify('The game stopped unexpectedly. Reload to restart. '+error.message,'warning');}
  }
  dispose(){cancelAnimationFrame(this.frameId);this.input.dispose();this.scene.dispose();this.audio.dispose();}
}
export function formatTime(seconds){if(!Number.isFinite(seconds))return '—';const m=Math.floor(seconds/60),s=seconds%60;return `${m}:${s.toFixed(2).padStart(5,'0')}`;}
function ordinal(n){return `${n}${n===1?'st':n===2?'nd':n===3?'rd':'th'}`;}
function keyLabel(key){return key?.replace('Key','').replace('Arrow','')||'E';}
