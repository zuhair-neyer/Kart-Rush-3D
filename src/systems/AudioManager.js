const NOTES=[130.81,164.81,196,246.94,174.61,220,261.63,329.63];
export class AudioManager {
  constructor(settings){this.settings=settings;this.context=null;this.running=false;this.musicStep=0;this.musicClock=0;this.activeVoices=0;}
  unlock(){
    if(!this.context){
      try{
        this.context=new(window.AudioContext||window.webkitAudioContext)();const c=this.context;
        this.master=c.createGain();this.master.connect(c.destination);this.sfx=c.createGain();this.sfx.connect(this.master);this.music=c.createGain();this.music.connect(this.master);
        this.engine=c.createOscillator();this.engine.type='sawtooth';this.engineGain=c.createGain();this.engineGain.gain.value=0;this.engineFilter=c.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.frequency.value=380;this.engine.connect(this.engineFilter).connect(this.engineGain).connect(this.sfx);this.engine.start();
        const buffer=c.createBuffer(1,c.sampleRate,c.sampleRate),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noiseBuffer=buffer;
        this.applySettings();
      }catch{this.context=null;return;}
    }
    if(this.context.state==='suspended'&&!this.suspendedByPause)this.context.resume().catch(()=>{});
  }
  applySettings(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(this.settings.muted?0:this.settings.master,t,.04);this.music.gain.setTargetAtTime(this.settings.music,t,.04);this.sfx.gain.setTargetAtTime(this.settings.sfx,t,.04);}
  tone(frequency,duration=.1,type='sine',volume=.2,slide=frequency,bus='sfx',delay=0){
    if(!this.context||this.context.state!=='running'||this.activeVoices>30)return;
    const c=this.context,start=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();this.activeVoices++;o.type=type;o.frequency.setValueAtTime(frequency,start);o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),start+duration);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume,start+.008);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g).connect(this[bus]);o.start(start);o.stop(start+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();this.activeVoices--;};
  }
  noise(duration=.12,volume=.13){if(!this.context||this.activeVoices>30)return;const c=this.context,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=700;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);s.connect(f).connect(g).connect(this.sfx);s.start();s.stop(c.currentTime+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
  play(type,value){
    if(!this.context)return;
    switch(type){
      case 'menu':this.tone(660,.045,'sine',.1,900);break;
      case 'coin':this.tone(1100,.11,'sine',.12,1700);break;
      case 'itemPickup':this.tone(420,.15,'triangle',.16,900);this.tone(1100,.2,'sine',.1,1400,'sfx',.1);break;
      case 'boost':this.noise(.45,.15);this.tone(90,.5,'sawtooth',.08,260);break;
      case 'collision':this.noise(.16,.22);this.tone(130,.15,'triangle',.2,45);break;
      case 'itemUse':this.tone(300,.3,'square',.07,800);break;
      case 'warning':this.tone(880,.12,'square',.07,660);break;
      case 'countdown':this.tone(440,.16,'sine',.2);break;
      case 'go':this.tone(880,.35,'triangle',.24);break;
      case 'lap':[523,659,784].forEach((f,i)=>this.tone(f,.23,'triangle',.16,f,'sfx',i*.09));break;
      case 'finish':[523,659,784,1046,784,1046].forEach((f,i)=>this.tone(f,.35,'triangle',.16,f,'sfx',i*.14));break;
      case 'reset':this.tone(380,.4,'sine',.1,140);break;
    }
  }
  update(dt,racer,active){
    if(!this.context||this.context.state!=='running')return;
    const t=this.context.currentTime,speed=Math.abs(racer?.speed||0),level=active ? .055+Math.min(speed/650,.06) : 0;
    this.engineGain.gain.setTargetAtTime(level,t,.12);this.engine.frequency.setTargetAtTime(42+speed*3+(racer?.boost>0?35:0),t,.1);this.engineFilter.frequency.setTargetAtTime(230+speed*13,t,.1);
    if(active&&racer?.drifting&&Math.random()<dt*5)this.noise(.09,.025);
    this.musicClock-=dt;if(this.musicClock<=0){this.musicClock=.26;const step=this.musicStep++,root=NOTES[(Math.floor(step/16)%4)*2];this.tone(root,.22,'triangle',.07,root,'music');if(step%2===0)this.tone(root*4*(step%8===6?1.5:1),.13,'sine',.08,root*4,'music');}
  }
  setPaused(paused){this.suspendedByPause=paused;if(!this.context)return;if(paused)this.context.suspend().catch(()=>{});else this.context.resume().catch(()=>{});}
  stopEngine(){if(this.context)this.engineGain.gain.setTargetAtTime(0,this.context.currentTime,.08);}
  dispose(){this.context?.close();}
}
