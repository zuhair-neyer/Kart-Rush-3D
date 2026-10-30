export class InputManager {
  constructor(settings,onPause,onInteract){
    this.settings=settings;this.onPause=onPause;this.keys=new Set();this.touch=new Set();this.pulses={item:false,reset:false};this.active=false;this.previousPad={};this.pointerControls=new Map();this.onInteract=onInteract;
    this.abort=new AbortController();const options={signal:this.abort.signal};
    window.addEventListener('keydown',e=>{
      this.onInteract?.();
      if(e.code==='Escape'&&!e.repeat){this.onPause?.();return;}
      if(!this.active)return;
      const mapped=Object.values(this.settings.keys);if(mapped.includes(e.code)||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
      if(!e.repeat){if(e.code===this.settings.keys.item)this.pulses.item=true;if(e.code===this.settings.keys.reset)this.pulses.reset=true;}
      this.keys.add(e.code);
    },options);
    window.addEventListener('keyup',e=>this.keys.delete(e.code),options);
    window.addEventListener('blur',()=>this.clear(),options);
    document.addEventListener('pointerdown',e=>{
      this.onInteract?.();const button=e.target.closest('[data-control]');if(!button)return;
      e.preventDefault();const control=button.dataset.control;this.pointerControls.set(e.pointerId,control);this.touch.add(control);button.classList.add('held');
      if(control==='item'||control==='reset')this.pulses[control]=true;
      try{button.setPointerCapture(e.pointerId);}catch{}
    },options);
    const release=e=>{const control=this.pointerControls.get(e.pointerId);this.pointerControls.delete(e.pointerId);if(![...this.pointerControls.values()].includes(control))this.touch.delete(control);document.querySelectorAll('[data-control]').forEach(b=>b.classList.toggle('held',this.touch.has(b.dataset.control)));};
    document.addEventListener('pointerup',release,options);document.addEventListener('pointercancel',release,options);
  }
  setActive(value){this.active=value;this.clear();}
  clear(){this.keys.clear();this.touch.clear();this.pointerControls.clear();this.pulses.item=false;this.pulses.reset=false;}
  gamepad(){
    const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);if(!pad){this.previousPad={};return null;}
    const down=i=>!!pad.buttons[i]?.pressed;
    if(down(9)&&!this.previousPad.pause)this.onPause?.();
    const value={steer:Math.abs(pad.axes[0]||0)>.13?(pad.axes[0]||0):0,throttle:pad.buttons[7]?.value||0,brake:pad.buttons[6]?.value||0,drift:down(0),item:down(2)&&!this.previousPad.item,reset:down(3)&&!this.previousPad.reset};
    if(down(14))value.steer=-1;if(down(15))value.steer=1;if(down(12))value.throttle=1;if(down(13))value.brake=1;
    this.previousPad={pause:down(9),item:down(2),reset:down(3)};return value;
  }
  read(){
    const g=this.gamepad(),k=this.settings.keys,held=(...keys)=>keys.some(key=>this.keys.has(key));
    const output={throttle:held(k.accelerate,'ArrowUp')||this.touch.has('throttle')?1:0,brake:held(k.brake,'ArrowDown')||this.touch.has('brake')?1:0,steer:Number(held(k.right,'ArrowRight')||this.touch.has('right'))-Number(held(k.left,'ArrowLeft')||this.touch.has('left')),drift:held(k.drift,'ShiftLeft','ShiftRight')||this.touch.has('drift'),item:this.pulses.item,reset:this.pulses.reset};
    this.pulses.item=false;this.pulses.reset=false;
    if(g){output.throttle=Math.max(output.throttle,g.throttle);output.brake=Math.max(output.brake,g.brake);if(Math.abs(g.steer)>Math.abs(output.steer))output.steer=g.steer;output.drift||=g.drift;output.item||=g.item;output.reset||=g.reset;}
    if(!this.active)return {throttle:0,brake:0,steer:0,drift:false,item:false,reset:false};
    return output;
  }
  dispose(){this.abort.abort();}
}
