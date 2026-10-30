import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {KARTS,DRIVERS} from './KartCatalog.js';

// Keep the articulated groups, but batch all their static detail by material.
// A six-kart race then needs about 180 kart draws instead of more than 700.
function batchStatic(group,exclude=[]){
  group.updateMatrixWorld(true);
  const inverse=group.matrixWorld.clone().invert(),batches=new Map(),originals=[];
  group.traverse(object=>{
    if(!object.isMesh)return;
    let ancestor=object;while(ancestor&&ancestor!==group){if(exclude.includes(ancestor))return;ancestor=ancestor.parent;}
    const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
    if(!batches.has(object.material))batches.set(object.material,[]);
    batches.get(object.material).push(geometry);originals.push(object);
  });
  for(const [material,geometries]of batches){
    const merged=mergeGeometries(geometries,false);
    if(!merged)throw new Error('Kart mesh batching failed.');
    const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    for(const geometry of geometries)geometry.dispose();
  }
  for(const mesh of originals){mesh.removeFromParent();mesh.geometry.dispose();}
}

/** Original toy-like kart geometry. The wheel pivots rotate around local X. */
export function createKartModel(kartId='comet',customization={}) {
  const spec=KARTS.find(k=>k.id===kartId)||KARTS[0];
  const driverSpec=DRIVERS.find(d=>d.id===customization.driverId)||DRIVERS[0];
  const kart=new THREE.Group();
  const body=new THREE.Group();kart.add(body);
  const paint=new THREE.MeshStandardMaterial({color:customization.paint||spec.color,roughness:.53,metalness:.12});
  const accent=new THREE.MeshStandardMaterial({color:customization.accent||'#f6eecf',roughness:.65});
  const dark=new THREE.MeshStandardMaterial({color:'#28333c',roughness:.8});
  const rubber=new THREE.MeshStandardMaterial({color:'#20292e',roughness:.93});
  const steel=new THREE.MeshStandardMaterial({color:'#c3d0cb',roughness:.4,metalness:.5});
  const visor=new THREE.MeshStandardMaterial({color:'#172d3c',roughness:.25,metalness:.3});
  const skin=new THREE.MeshStandardMaterial({color:driverSpec.color,roughness:.9});
  const suit=new THREE.MeshStandardMaterial({color:customization.accent||'#f6eecf',roughness:.85});
  const light=new THREE.MeshStandardMaterial({color:'#fff1b9',emissive:'#fff1b9',emissiveIntensity:.4});
  const rearLight=new THREE.MeshStandardMaterial({color:'#f26768',emissive:'#d83e55',emissiveIntensity:.25});
  function box(parent,w,h,d,x,y,z,mat=paint,r=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.rotation.z=r;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function ball(parent,r,x,y,z,mat=paint,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
  function tube(parent,r,len,x,y,z,mat=dark,axis='z'){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,10),mat);m.position.set(x,y,z);if(axis==='z')m.rotation.x=Math.PI/2;else if(axis==='x')m.rotation.z=Math.PI/2;parent.add(m);m.castShadow=true;return m;}
  const isBuggy=kartId==='sprout'||kartId==='bison',isWide=kartId==='manta';
  const bodyWidth=isWide?1.9:kartId==='bison'?1.78:1.58;
  const bodyLength=kartId==='rocket'?3.05:2.75;
  box(body,bodyWidth,.33,bodyLength,0,.60,0);
  box(body,bodyWidth+.12,.14,bodyLength+.15,0,.4,0,dark);
  box(body,.83,.23,1.03,0,.86,.78);
  box(body,.23,.015,1.24,0,.99,.81,accent);
  // Side pods, inset cockpit and tail deck.
  box(body,.32,.38,1.48,-bodyWidth/2,.8,-.09);
  box(body,.32,.38,1.48,bodyWidth/2,.8,-.09);
  box(body,.91,.16,.83,0,.82,-.29,dark);
  box(body,.87,.54,.2,0,1.06,-.70,dark);
  box(body,.72,.44,.09,0,1.08,-.57,accent);
  box(body,bodyWidth,.27,.55,0,.87,-1.09);
  // Front crash bar and two inset headlights.
  tube(body,.105,bodyWidth+.55,0,.59,1.55,steel,'x');
  for(const side of [-1,1]){
    box(body,.38,.15,.09,side*.53,.86,1.40,light);
    box(body,.29,.12,.09,side*.52,.82,-1.40,rearLight);
    box(body,.06,.12,.62,side*.88,.57,1.19,dark);
    tube(body,.09,.50,side*.53,.64,-1.48,steel);
  }
  if(kartId==='comet'){
    box(body,1.72,.13,.41,0,1.27,-1.32,accent);
    for(const s of [-1,1])box(body,.10,.37,.10,s*.55,1.09,-1.29,dark);
  }else if(kartId==='sprout'){
    tube(body,.065,1.60,0,1.97,-.81,accent,'x');
    for(const s of [-1,1]){tube(body,.065,1.14,s*.8,1.42,-.81,accent,'y');box(body,.53,.17,.73,s*1.0,1.02,-.9);}
    ball(body,.17,0,1.05,1.31,accent,2.3,.65,.55);
  }else if(kartId==='manta'){
    for(const s of [-1,1]){const fin=box(body,.38,.12,2.42,s*1.03,.79,-.13);fin.rotation.y=s*.16;box(body,.21,.25,.77,s*.93,.90,-.96,accent);}
    box(body,2.0,.11,.31,0,.79,1.42,accent);
  }else if(kartId==='bison'){
    box(body,1.75,.42,.94,0,1.00,.95);
    box(body,1.4,.26,.07,0,1.03,1.45,dark);
    for(let i=-3;i<=3;i++)box(body,.06,.21,.02,i*.15,1.04,1.50,steel);
    for(const s of [-1,1])box(body,.42,.21,2.44,s*1.02,.91,0);
    tube(body,.11,1.5,0,.62,1.7,dark,'x');
  }else if(kartId==='volt'){
    for(const s of [-1,1]){const fin=box(body,.2,.39,1.48,s*.74,1.07,-.35,accent);fin.rotation.z=-s*.12;box(body,.45,.08,1.75,s*.73,.81,.54);}
    box(body,1.98,.09,.4,0,1.32,-1.32,paint);
    for(const s of [-1,1])box(body,.09,.45,.19,s*.68,1.08,-1.25,accent);
  }else{
    ball(body,.70,0,.78,.98,paint,1,.55,1.1);
    box(body,.20,.025,1.8,0,1.145,.54,accent);
    for(const s of [-1,1]){tube(body,.24,.87,s*.82,.94,-1.19,steel);tube(body,.17,.09,s*.82,.94,-1.64,dark);}
    box(body,1.85,.11,.41,0,1.34,-1.31,accent);
  }
  const wheels=[],frontWheels=[];
  const chunky=customization.wheels==='chunky'||isBuggy;
  const wheelRadius=chunky?.47:.40;
  for(const z of [-.97,1.0])for(const side of [-1,1]){
    const steering=new THREE.Group();steering.position.set(side*(isWide?1.17:1.04),wheelRadius,z);kart.add(steering);
    const wheel=new THREE.Group();steering.add(wheel);wheels.push(wheel);if(z>0)frontWheels.push(steering);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius,wheelRadius,chunky?.43:.36,16),rubber);tire.rotation.z=Math.PI/2;wheel.add(tire);tire.castShadow=true;
    for(const sx of [-1,1]){
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius*.66,wheelRadius*.66,.025,12),customization.wheels==='sport'?accent:steel);rim.rotation.z=Math.PI/2;rim.position.x=sx*(chunky?.223:.188);wheel.add(rim);
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.038,8),paint);hub.rotation.z=Math.PI/2;hub.position.x=sx*(chunky?.244:.210);wheel.add(hub);
      for(let n=0;n<5;n++){
        const spoke=new THREE.Mesh(new THREE.BoxGeometry(.028,.055,wheelRadius*1.04),dark);spoke.rotation.x=n*Math.PI/5;spoke.position.x=sx*(chunky?.239:.204);wheel.add(spoke);
      }
    }
    if(chunky)for(let n=0;n<12;n++){
      const grip=box(wheel,.43,.065,.14,0,Math.cos(n*Math.PI/6)*wheelRadius,Math.sin(n*Math.PI/6)*wheelRadius,rubber);grip.rotation.x=n*Math.PI/6;
    }
  }
  // The original cast shares a readable silhouette: oversized head, tiny suit,
  // visible hands and steering wheel. Each character has its own face detail.
  const driver=new THREE.Group();body.add(driver);
  ball(driver,.41,0,1.25,-.24,suit,.80,1,.77);
  const head=ball(driver,.46,0,1.83,-.22,skin,1,.98,.95);
  if(driverSpec.id==='bolt'){
    head.scale.set(1.04,.94,.94);
    box(driver,.70,.25,.14,0,1.84,.18,visor);
    const eyeGlow=new THREE.MeshStandardMaterial({color:'#b7ffff',emissive:'#7fe9e8',emissiveIntensity:.8});
    for(const s of [-1,1])box(driver,.12,.085,.018,s*.17,1.86,.27,eyeGlow);
    tube(driver,.035,.18,0,2.32,-.2,steel,'y');ball(driver,.07,0,2.43,-.2,paint);
  }else{
    const helmet=ball(driver,.482,0,1.98,-.28,paint,1,.72,1);
    box(driver,.10,.09,.68,0,2.29,-.20,accent);
    for(const s of [-1,1]){ball(driver,.085,s*.16,1.84,.195,visor,.72,1,.44);ball(driver,.026,s*.145,1.863,.226,accent);}
    ball(driver,.09,0,1.72,.21,skin,1.1,.7,1.05);
    if(driverSpec.id==='pip')for(const s of [-1,1])ball(driver,.17,s*.38,2.15,-.28,skin,.75,1.55,.65);
    if(driverSpec.id==='nova')for(const s of [-1,1])ball(driver,.15,s*.37,2.13,-.26,accent,.7,1.7,.65);
    if(driverSpec.id==='moss'){
      const leaf=new THREE.Mesh(new THREE.ConeGeometry(.18,.46,5),skin);leaf.position.set(0,2.43,-.27);leaf.rotation.z=-.32;driver.add(leaf);
    }
  }
  for(const s of [-1,1]){
    const arm=ball(driver,.19,s*.33,1.34,.12,suit,.7,1,1.6);arm.rotation.z=s*.3;
    ball(driver,.14,s*.31,1.32,.36,skin);
  }
  const steeringWheel=new THREE.Mesh(new THREE.TorusGeometry(.31,.046,6,16),dark);steeringWheel.position.set(0,1.32,.49);steeringWheel.rotation.x=-.55;body.add(steeringWheel);
  tube(body,.034,.40,0,1.09,.62,steel,'y');
  const accessory=customization.accessory||'none';
  if(accessory==='flag'){
    tube(body,.027,1.63,-.6,1.82,-1.16,steel,'y');
    const g=new THREE.PlaneGeometry(.55,.36);const flag=new THREE.Mesh(g,accent);flag.position.set(-.31,2.52,-1.16);body.add(flag);
    for(let x=0;x<3;x++)for(let y=0;y<2;y++)if((x+y)%2===0)box(body,.18,.18,.013,-.5+x*.18,2.61-y*.18,-1.15,dark);
  }else if(accessory==='fin'){
    const g=new THREE.ConeGeometry(.34,.73,3);const fin=new THREE.Mesh(g,accent);fin.rotation.x=Math.PI/2;fin.position.set(0,1.15,-1.04);body.add(fin);
  }else if(accessory==='antenna'){
    tube(body,.025,1.29,.61,1.79,-1.02,steel,'y');
    const shape=new THREE.Shape();for(let n=0;n<10;n++){const a=n*Math.PI/5+Math.PI/2,r=n%2?.12:.25;n?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();
    const star=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false}),accent);star.position.set(.61,2.50,-1.02);body.add(star);
  }
  for(const wheel of wheels)batchStatic(wheel);
  batchStatic(driver);
  batchStatic(body,[driver,steeringWheel]);
  kart.userData={wheels,frontWheels,body,driver,kartId,steeringWheel,wheelRadius};
  return kart;
}
