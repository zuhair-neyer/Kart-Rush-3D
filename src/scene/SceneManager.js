import * as THREE from 'three';
import {TrackWorld} from '../tracks/TrackWorld.js';
import {createKartModel} from '../vehicles/KartModel.js';
import {KARTS,DRIVERS} from '../vehicles/KartCatalog.js';
import {ParticleSystem} from '../systems/ParticleSystem.js';

const lerpAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function disposeGroup(group){
  if(!group)return;const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
export class SceneManager {
  constructor(canvas,settings){
    this.canvas=canvas;this.settings=settings;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(48,1,.1,1000);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.ambient=new THREE.HemisphereLight(0xe4f9ff,0x536147,2.25);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xfff0d0,3.15);this.sun.position.set(60,100,-30);this.sun.castShadow=true;this.sun.shadow.camera.left=-65;this.sun.shadow.camera.right=65;this.sun.shadow.camera.top=65;this.sun.shadow.camera.bottom=-65;this.sun.shadow.camera.near=.1;this.sun.shadow.camera.far=250;this.sun.shadow.bias=-.0005;this.sun.shadow.normalBias=.045;this.scene.add(this.sun,this.sun.target);
    this.kartGroup=new THREE.Group();this.scene.add(this.kartGroup);this.collectibleGroup=new THREE.Group();this.scene.add(this.collectibleGroup);this.hazardGroup=new THREE.Group();this.scene.add(this.hazardGroup);this.showroom=new THREE.Group();this.scene.add(this.showroom);
    this.particles=new ParticleSystem(this.scene);this.racerModels=new Map();this.collectibles=new Map();this.hazardModels=new Map();this.view='menu';this.cameraReady=false;this.shake=0;this.menuTime=0;this.garageAngle=.7;this.manualRotation=0;this.lastParticleTime=0;
    this.target=new THREE.Vector3();this.desired=new THREE.Vector3();this.lookAt=new THREE.Vector3();this.lastLook=new THREE.Vector3();this.makeShowroom();this.applySettings();this.resize();
    this.abort=new AbortController();window.addEventListener('resize',()=>this.resize(),{signal:this.abort.signal});
    let pointer=null;canvas.addEventListener('pointerdown',e=>{if(this.view!=='garage')return;pointer={x:e.clientX,id:e.pointerId};canvas.setPointerCapture(e.pointerId);},{signal:this.abort.signal});canvas.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId){this.rotatePreview((e.clientX-pointer.x)*.013);pointer.x=e.clientX;}},{signal:this.abort.signal});canvas.addEventListener('pointerup',()=>pointer=null,{signal:this.abort.signal});
  }
  makeShowroom(){
    const floor=new THREE.Mesh(new THREE.CylinderGeometry(5.3,5.6,.45,64),new THREE.MeshStandardMaterial({color:0x5d767c,roughness:.85}));floor.position.y=-.3;floor.receiveShadow=true;this.showroom.add(floor);
    const outer=new THREE.Mesh(new THREE.TorusGeometry(5.1,.025,6,80),new THREE.MeshBasicMaterial({color:0xc9f569}));outer.rotation.x=Math.PI/2;outer.position.y=-.055;this.showroom.add(outer);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(3.4,.018,6,80),new THREE.MeshBasicMaterial({color:0x9dbfc1}));inner.rotation.x=Math.PI/2;inner.position.y=-.055;this.showroom.add(inner);
    this.showroom.visible=false;
  }
  setRoute(route){
    this.world?.dispose();this.route=route;this.world=new TrackWorld(this.scene,route,this.settings.quality);this.world.group.visible=this.view!=='garage';
    this.setAtmosphere();this.particles.clear();this.cameraReady=false;this.clearRacers();this.makeDemoRacers();
  }
  setAtmosphere(){
    if(!this.route)return;const d=this.route.definition,garage=this.view==='garage';this.scene.background=new THREE.Color(garage?'#203d48':d.sky);this.scene.fog=new THREE.Fog(garage?'#203d48':d.sky,garage?40:190,garage?120:620);
    this.ambient.color.set(garage?'#effaff':d.id==='city'?'#b9c9ff':'#e6faff');this.ambient.groundColor.set(garage?'#51666d':d.ground);this.ambient.intensity=d.id==='city'&&!garage?1.7:2.25;this.sun.color.set(garage?'#fff1cc':d.sun);this.sun.intensity=d.id==='city'&&!garage?1.7:3.15;
  }
  applySettings(){
    const profile={low:{ratio:1,shadow:512},medium:{ratio:1.4,shadow:1024},high:{ratio:2,shadow:2048}}[this.settings.quality]||{ratio:1.4,shadow:1024};
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,profile.ratio));this.renderer.shadowMap.enabled=this.settings.shadows&&this.settings.quality!=='low';this.sun.shadow.mapSize.set(profile.shadow,profile.shadow);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}this.renderer.shadowMap.needsUpdate=true;this.resize();
  }
  resize(){const w=window.innerWidth,h=window.innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  clearRacers(){for(const group of this.racerModels.values())disposeGroup(group);this.racerModels.clear();for(const m of this.collectibles.values())disposeGroup(m);this.collectibles.clear();for(const m of this.hazardModels.values())disposeGroup(m);this.hazardModels.clear();}
  makeRacer(racer,customization={}){
    const model=createKartModel(racer.kartId,{paint:racer.color,driverId:DRIVERS[(racer.index||0)%DRIVERS.length].id,...customization});model.userData.bodyY=model.userData.body.position.y;
    const shell=new THREE.Mesh(new THREE.SphereGeometry(2.12,16,10),new THREE.MeshBasicMaterial({color:0x8ce9ff,transparent:true,opacity:.17,wireframe:true,depthWrite:false}));shell.position.y=1;shell.visible=false;model.add(shell);model.userData.shell=shell;
    const ring=new THREE.Mesh(new THREE.RingGeometry(1.62,1.78,32),new THREE.MeshBasicMaterial({color:0xd1ff74,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.055;ring.visible=!!racer.isPlayer;model.add(ring);model.userData.ring=ring;
    this.kartGroup.add(model);this.racerModels.set(racer.id,model);return model;
  }
  makeDemoRacers(){
    this.demoRacers=KARTS.map((kart,index)=>({id:'demo-'+index,kartId:kart.id,color:kart.color,index,speed:24,steer:.2,isPlayer:false,heading:0,x:0,y:0,z:0}));
    this.demoRacers.forEach(r=>this.makeRacer(r));
  }
  setRace(race,customization){this.clearRacers();this.race=race;this.setView('race');race.racers.forEach(r=>this.makeRacer(r,r.isPlayer?customization:{}));this.makeCollectibles(race);this.cameraReady=false;this.particles.clear();}
  setView(view){this.view=view;this.showroom.visible=view==='garage';this.kartGroup.visible=view!=='garage';this.collectibleGroup.visible=view==='race';this.hazardGroup.visible=view==='race';if(this.world)this.world.group.visible=view!=='garage';this.particles.points.visible=view==='race';this.particles.skids.forEach(s=>{if(view!=='race')s.visible=false;});this.setAtmosphere();this.cameraReady=false;}
  previewKart(kartId,customization){if(this.preview)disposeGroup(this.preview);this.preview=createKartModel(kartId,customization);this.preview.scale.setScalar(1.35);this.showroom.add(this.preview);}
  rotatePreview(delta){this.garageAngle+=delta*(this.settings.invertCamera?-1:1)*this.settings.cameraSensitivity;this.manualRotation=3;}
  makeCollectibles(race){
    // Shared geometry keeps dozens of collectibles inexpensive to draw and update.
    const coinGeometry=new THREE.CylinderGeometry(.65,.65,.16,16),coinMaterial=new THREE.MeshStandardMaterial({color:0xffd45c,metalness:.55,roughness:.28,emissive:0xffaf00,emissiveIntensity:.12});
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#52c7c5';c.fillRect(0,0,128,128);c.strokeStyle='#b9fff1';c.lineWidth=7;c.strokeRect(9,9,110,110);c.fillStyle='#f8fff2';c.font='900 94px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('?',64,69);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const boxGeometry=new THREE.BoxGeometry(1.65,1.65,1.65),boxMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.4,emissive:0x348e8c,emissiveIntensity:.2});
    for(const item of race.collectibles){const mesh=new THREE.Mesh(item.type==='coin'?coinGeometry:boxGeometry,item.type==='coin'?coinMaterial:boxMaterial);if(item.type==='coin')mesh.rotation.z=Math.PI/2;mesh.castShadow=true;mesh.position.set(item.x,item.y,item.z);mesh.userData.type=item.type;this.collectibleGroup.add(mesh);this.collectibles.set(item.id,mesh);}
  }
  animateKart(r,dt,time){
    const m=this.racerModels.get(r.id);if(!m)return;m.position.set(r.x,r.y,r.z);m.rotation.y=r.heading;m.visible=!(r.resetTimer>0&&Math.floor(time*10)%2===0);
    const d=m.userData;d.wheels.forEach(w=>w.rotation.x+=r.speed*dt/(d.wheelRadius||.4));d.frontWheels.forEach(w=>w.rotation.y=(r.steer||0)*.45);
    d.body.rotation.z=-(r.steer||0)*Math.min(Math.abs(r.speed)/38,1)*.085;d.body.rotation.x=r.airborne?-.09:Math.sin(time*12+r.index)*Math.abs(r.speed)*.0003;
    d.body.position.y=d.bodyY+Math.sin(time*18+r.index)*Math.min(Math.abs(r.speed)*.0009,.03)-(r.suspension||0);d.shell.visible=!!r.shield||r.ghost>0;d.shell.material.color.set(r.ghost>0?0xc5b1ff:0x78deff);d.shell.rotation.y=time*.4;
    if(d.ring)d.ring.material.opacity=r.boost>0?.9:.45;
  }
  updateHazards(race,time){
    const active=new Set();for(const h of race.hazards){active.add(h.id);let m=this.hazardModels.get(h.id);if(!m){
      const geometry=h.type==='oil'?new THREE.CircleGeometry(h.radius||2.4,24):h.type==='pulse'?new THREE.TorusGeometry(1,.045,5,48):new THREE.OctahedronGeometry(.55,0);
      m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:h.type==='oil'?0x242d48:h.type==='pulse'?0x99eeff:0xffba59,transparent:true,opacity:h.type==='oil'?.8:.9,side:THREE.DoubleSide,depthWrite:false}));if(h.type!=='spark')m.rotation.x=-Math.PI/2;this.hazardGroup.add(m);this.hazardModels.set(h.id,m);
    }m.position.set(h.x,h.y+.08,h.z);if(h.type==='pulse'){m.scale.setScalar(Math.max(.1,h.radius));m.material.opacity=Math.max(0,h.life/.7);}if(h.type==='spark'){m.rotation.y=time*9;m.rotation.z=time*5;}}
    for(const [id,m] of this.hazardModels)if(!active.has(id)){disposeGroup(m);this.hazardModels.delete(id);}
  }
  event(event,race){
    const r=race.racers.find(r=>r.id===event.racerId)||race.player,x=event.x??r.x,y=event.y??r.y,z=event.z??r.z;
    if(event.type==='collision'){if(r.isPlayer)this.shake=Math.min(.45,event.strength||.2);this.particles.emit(x,y+.65,z,0xffd774,14,4);}
    else if(event.type==='coin')this.particles.emit(x,y,z,0xffd55d,9,2.6);
    else if(event.type==='itemPickup')this.particles.emit(x,y,z,0x8bffe1,12,2.8);
    else if(event.type==='land'){if(r.isPlayer)this.shake=.11;this.particles.emit(x,y+.2,z,0xbab7a1,10,2);}
    else if(event.type==='respawn'){this.cameraReady=false;this.particles.emit(x,y+1,z,0xdbedff,15,2);}
    else if(event.type==='shieldHit')this.particles.emit(x,y+1,z,0xa4efff,14,4);
  }
  update(dt,time,race,paused=false){
    const step=paused?0:dt;this.world?.update(step,time);this.menuTime+=dt;this.particles.update(step);
    if(this.view==='garage'){
      this.manualRotation=Math.max(0,this.manualRotation-dt);if(this.manualRotation<=0)this.garageAngle+=dt*.2;if(this.preview)this.preview.rotation.y=this.garageAngle;
      const narrow=this.camera.aspect<1;this.desired.set(narrow?9:8.5,narrow?5.3:4.7,narrow?12:11);this.lookAt.set(narrow?0:-2.8,.7,0);this.camera.fov=40;
      this.sun.position.set(20,35,12);this.sun.target.position.set(0,0,0);
    }else if(this.view==='race'&&race){
      race.racers.forEach(r=>this.animateKart(r,step,time));for(const c of race.collectibles){const m=this.collectibles.get(c.id);if(m){m.visible=c.active;m.position.y=c.y+Math.sin(time*3+c.t*50)*.14;m.rotation.y=time*1.7;if(c.type==='box')m.rotation.z=Math.sin(time+c.t*4)*.12;}}
      this.updateHazards(race,time);
      const p=race.player,heading=p.heading,speed=Math.abs(p.speed),distance=10+Math.min(speed/15,3.1)+(p.boost>0?1.3:0);
      this.desired.set(p.x-Math.sin(heading)*distance,p.y+6.0+Math.min(speed/45,1),p.z-Math.cos(heading)*distance);this.lookAt.set(p.x+Math.sin(heading)*6,p.y+1.3,p.z+Math.cos(heading)*6);
      // The chase rig is always well above the local road; scenery sits outside barriers.
      const cameraRoad=this.route.project(this.desired.x,this.desired.z);this.desired.y=Math.max(this.desired.y,cameraRoad.y+3.2);
      const wantedFov=52+(p.boost>0?6:0)+Math.min(speed/30,2);this.camera.fov+=(wantedFov-this.camera.fov)*(1-Math.exp(-dt*3));
      this.sun.position.set(p.x+45,p.y+85,p.z-35);this.sun.target.position.set(p.x,p.y,p.z);
      if(!paused&&time-this.lastParticleTime>.065){this.lastParticleTime=time;for(const r of race.racers){if(this.settings.reducedEffects&&!r.isPlayer)continue;const x=r.x-Math.sin(r.heading)*1.4,z=r.z-Math.cos(r.heading)*1.4;
        if(r.drifting){const color=r.driftCharge>2.4?0xfa85ff:r.driftCharge>1.45?0xffb849:r.driftCharge>.65?0x8dd5ff:0xd9dedd;this.particles.emit(x,r.y+.2,z,color,this.settings.reducedEffects?1:3,1.2);this.particles.skid(r);}
        else if(r.offRoad&&speed>8)this.particles.emit(x,r.y+.2,z,0xb3af88,2,1);
        if(r.boost>0)this.particles.emit(x,r.y+.6,z,0xa5e9ff,this.settings.reducedEffects?1:4,1.3);
      }}
    }else if(this.route){
      for(let i=0;i<this.demoRacers.length;i++){const r=this.demoRacers[i],t=(time*.032+i*.13)%1,p=this.route.getPoint(t);const lane=Math.sin(i)*2;r.x=p.x+Math.cos(p.heading)*lane;r.y=p.y;r.z=p.z-Math.sin(p.heading)*lane;r.heading=p.heading;this.animateKart(r,dt,time);}
      const b=this.route.bounds,cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,span=Math.max(b.maxX-b.minX,b.maxZ-b.minZ);const narrow=this.camera.aspect<1;
      const angle=.48+Math.sin(time*.035)*.05;this.desired.set(cx+Math.sin(angle)*span*.87,span*.78,cz+Math.cos(angle)*span*.93);
      this.lookAt.set(cx-(narrow?0:span*.25),0,cz);this.camera.fov=narrow?57:47;this.sun.position.set(60,100,-30);this.sun.target.position.set(0,0,0);
    }
    if(!this.cameraReady){this.camera.position.copy(this.desired);this.lastLook.copy(this.lookAt);this.cameraReady=true;}else{const damping=1-Math.exp(-dt*(this.view==='race'?5.5*this.settings.cameraSensitivity:2));this.camera.position.lerp(this.desired,damping);this.lastLook.lerp(this.lookAt,damping);}
    this.shake*=Math.exp(-dt*10);if(this.settings.shake&&!this.settings.reducedEffects&&this.shake>.001){this.camera.position.x+=(Math.random()-.5)*this.shake;this.camera.position.y+=(Math.random()-.5)*this.shake;}
    this.camera.lookAt(this.lastLook);this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.abort.abort();this.clearRacers();this.world?.dispose();disposeGroup(this.showroom);this.particles.dispose();this.renderer.dispose();}
}
