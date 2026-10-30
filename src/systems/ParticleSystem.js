import * as THREE from 'three';
export class ParticleSystem {
  constructor(scene,max=420){
    this.max=max;this.cursor=0;this.positions=new Float32Array(max*3);this.colors=new Float32Array(max*3);this.velocities=new Float32Array(max*3);this.life=new Float32Array(max);this.totalLife=new Float32Array(max);
    for(let i=0;i<max;i++)this.positions[i*3+1]=-999;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3));
    this.material=new THREE.PointsMaterial({size:.36,vertexColors:true,transparent:true,opacity:.85,depthWrite:false,sizeAttenuation:true});this.points=new THREE.Points(geometry,this.material);this.points.frustumCulled=false;scene.add(this.points);
    this.skids=[];this.skidCursor=0;this.skidGeometry=new THREE.PlaneGeometry(.23,1.1);this.skidMaterial=new THREE.MeshBasicMaterial({color:0x222b32,transparent:true,opacity:.27,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    for(let i=0;i<150;i++){const m=new THREE.Mesh(this.skidGeometry,this.skidMaterial);m.visible=false;scene.add(m);this.skids.push(m);}
  }
  emit(x,y,z,color,count=5,power=2){const c=new THREE.Color(color);for(let n=0;n<count;n++){const i=this.cursor++%this.max,p=i*3;this.positions[p]=x;this.positions[p+1]=y;this.positions[p+2]=z;this.velocities[p]=(Math.random()-.5)*power*2;this.velocities[p+1]=Math.random()*power+1;this.velocities[p+2]=(Math.random()-.5)*power*2;this.colors[p]=c.r;this.colors[p+1]=c.g;this.colors[p+2]=c.b;this.life[i]=this.totalLife[i]=.35+Math.random()*.5;}}
  skid(racer){for(const side of [-1,1]){const mark=this.skids[this.skidCursor++%this.skids.length];mark.position.set(racer.x+Math.cos(racer.heading)*side*.82,racer.y+.04,racer.z-Math.sin(racer.heading)*side*.82);mark.rotation.set(-Math.PI/2,0,-racer.heading);mark.visible=true;}}
  update(dt){for(let i=0;i<this.max;i++){if(this.life[i]<=0)continue;this.life[i]-=dt;const p=i*3;if(this.life[i]<=0){this.positions[p+1]=-999;continue;}this.positions[p]+=this.velocities[p]*dt;this.positions[p+1]+=this.velocities[p+1]*dt;this.positions[p+2]+=this.velocities[p+2]*dt;this.velocities[p+1]-=3*dt;}this.points.geometry.attributes.position.needsUpdate=true;this.points.geometry.attributes.color.needsUpdate=true;}
  clear(){this.life.fill(0);for(let i=0;i<this.max;i++)this.positions[i*3+1]=-999;this.skids.forEach(s=>s.visible=false);this.points.geometry.attributes.position.needsUpdate=true;}
  dispose(){this.points.removeFromParent();this.points.geometry.dispose();this.material.dispose();this.skids.forEach(s=>s.removeFromParent());this.skidGeometry.dispose();this.skidMaterial.dispose();}
}
