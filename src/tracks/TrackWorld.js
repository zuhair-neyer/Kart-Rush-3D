import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const TAU=Math.PI*2;
function randomGenerator(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}

/** All course art is generated locally and shares the physics route. */
export class TrackWorld {
  constructor(scene,route,quality='medium'){
    this.scene=scene;this.route=route;this.quality=quality;this.group=new THREE.Group();this.group.name=`${route.id}-world`;
    this.materials=new Map();this.textures=[];this.animated=[];
    this.random=randomGenerator({valley:127,coast:241,city:359,lava:487}[route.id]);
    scene.add(this.group);
    this.createTerrain();this.createRoad();this.createFurniture();this.createScenery();this.batchScenery();
  }
  mat(color,options={}){
    const key=`${color}-${JSON.stringify(options)}`;
    if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.93,...options}));
    return this.materials.get(key);
  }
  mesh(geometry,material,x=0,y=0,z=0,parent=this.group){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  box(w,h,d,x,y,z,color,ry=0,parent=this.group){const mesh=this.mesh(new THREE.BoxGeometry(w,h,d),typeof color==='string'?this.mat(color):color,x,y,z,parent);mesh.rotation.y=ry;return mesh;}
  instance(geometry,material,items,colors=null,cast=true){
    if(!items.length){geometry.dispose();return null;}
    const mesh=new THREE.InstancedMesh(geometry,material,items.length),dummy=new THREE.Object3D();
    items.forEach((p,i)=>{dummy.position.set(p.x||0,p.y||0,p.z||0);dummy.rotation.set(p.rx||0,p.ry||0,p.rz||0);dummy.scale.set(p.sx??1,p.sy??1,p.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(colors)mesh.setColorAt(i,new THREE.Color(colors[i%colors.length]));});
    mesh.castShadow=cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.group.add(mesh);return mesh;
  }
  strip(left,right,material,offset=0,segments=640){
    const positions=[],indices=[];
    for(let i=0;i<=segments;i++){
      const p=this.route.getPoint(i/segments),nx=Math.cos(p.heading),nz=-Math.sin(p.heading);
      positions.push(p.x+nx*left,p.y+offset,p.z+nz*left,p.x+nx*right,p.y+offset,p.z+nz*right);
      if(i<segments){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    const mesh=this.mesh(g,material);mesh.castShadow=false;return mesh;
  }
  createTerrain(){
    const {id,definition}=this.route;
    if(id==='coast'){
      const sea=this.mesh(new THREE.CircleGeometry(650,64),this.mat('#63c9cf',{roughness:.38,metalness:.08}),0,-2.3,0);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
      const beach=this.mesh(new THREE.CylinderGeometry(182,197,2,60),this.mat('#ebd49d'),0,-1.5,4);beach.castShadow=false;
      const lagoon=this.mesh(new THREE.CircleGeometry(1,40),this.mat('#78d9d6',{roughness:.4}),-15,-.44,18);lagoon.rotation.x=-Math.PI/2;lagoon.scale.set(54,45,1);lagoon.castShadow=false;
      const lagoonEdge=this.mesh(new THREE.RingGeometry(1,1.055,40),this.mat('#b8e7db',{roughness:.65}),-15,-.43,18);lagoonEdge.rotation.x=-Math.PI/2;lagoonEdge.scale.set(54,45,1);lagoonEdge.castShadow=false;
      // A distant warm sun reflected in the turquoise ocean.
      this.mesh(new THREE.SphereGeometry(18,20,12),this.mat('#ffdf9f',{emissive:'#ffc27d',emissiveIntensity:.6}),110,57,-285).castShadow=false;
      const waveLines=[];for(let n=0;n<24;n++){const angle=this.random()*TAU,r=207+this.random()*120;waveLines.push({x:Math.cos(angle)*r,y:-2.26,z:Math.sin(angle)*r,sx:10+this.random()*18,sy:.02,sz:.26,ry:this.random()*.5});}
      this.instance(new THREE.BoxGeometry(1,1,1),this.mat('#bbefdc'),waveLines,null,false);
    }else{
      const ground=this.mesh(new THREE.CircleGeometry(640,64),this.mat(definition.ground),0,-.40,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
      if(id==='valley'){
        const hills=[],colors=[];
        for(let i=0;i<52;i++){const a=i/52*TAU,r=183+this.random()*130,s=17+this.random()*35;hills.push({x:Math.cos(a)*r,y:-3,z:Math.sin(a)*r,sx:s,sy:12+this.random()*32,sz:s*.8,ry:a});colors.push(['#7ebd7b','#95d58a','#72b880','#a5d998'][i%4]);}
        this.instance(new THREE.SphereGeometry(1,10,6),this.mat('#ffffff',{flatShading:true}),hills,colors,false);
        this.mesh(new THREE.SphereGeometry(14,16,12),this.mat('#fff3cd',{emissive:'#ffe9b6',emissiveIntensity:.6}),-170,153,-280).castShadow=false;
      }else if(id==='city'){
        const points=[];for(let i=-250;i<=250;i+=25){points.push(-250,-.33,i,250,-.33,i,i,-.33,-250,i,-.33,250);}
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.group.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#36415d',transparent:true,opacity:.7})));
        this.mesh(new THREE.SphereGeometry(13,16,12),this.mat('#e5e8f9',{emissive:'#dbe4ff',emissiveIntensity:.65}),-160,131,-240).castShadow=false;
      }else{
        const hills=[],colors=[];
        for(let i=0;i<36;i++){const a=i/36*TAU,r=178+this.random()*85;hills.push({x:Math.cos(a)*r,y:12,z:Math.sin(a)*r,sx:20+this.random()*26,sy:29+this.random()*45,sz:20+this.random()*23,ry:a});colors.push(['#605168','#594956','#75616b','#4c4053'][i%4]);}
        this.instance(new THREE.ConeGeometry(1,1,7),this.mat('#ffffff',{flatShading:true}),hills,colors,false);
        const lava=this.mat('#fb8050',{emissive:'#ef4d27',emissiveIntensity:.65,roughness:.6});
        const pool=this.mesh(new THREE.CircleGeometry(1,36),lava,-15,-.28,4);pool.rotation.x=-Math.PI/2;pool.scale.set(56,49,1);pool.castShadow=false;
        const smaller=this.mesh(new THREE.CircleGeometry(1,24),lava,146,-.26,15);smaller.rotation.x=-Math.PI/2;smaller.scale.set(33,84,1);smaller.castShadow=false;
        const floating=[];for(let i=0;i<22;i++){const a=this.random()*TAU,r=this.random()*46;floating.push({x:-15+Math.cos(a)*r,y:.15,z:4+Math.sin(a)*r,sx:1+this.random()*5,sy:.5+this.random()*1.5,sz:1+this.random()*4,ry:a});}
        this.instance(new THREE.DodecahedronGeometry(1,0),this.mat('#493e4c',{flatShading:true}),floating);
      }
    }
    if(id==='valley'||id==='coast'){
      const clouds=[];for(let i=0;i<21;i++){const a=this.random()*TAU,r=180+this.random()*200,x=Math.cos(a)*r,z=Math.sin(a)*r,y=55+this.random()*58;for(let k=0;k<3;k++)clouds.push({x:x+k*9,y:y+Math.sin(k)*2,z,sx:9+this.random()*6,sy:4+this.random()*4,sz:6+this.random()*4});}
      this.instance(new THREE.SphereGeometry(1,8,5),this.mat(id==='coast'?'#ffecce':'#e7f7ec',{flatShading:true}),clouds,null,false);
    }
  }
  createRoad(){
    const {route}=this,{id,width,barrierWidth,definition}=route;
    const asphalt=this.mat(definition.road),shoulder=this.mat(id==='city'?'#4c536b':id==='lava'?'#8c7466':id==='coast'?'#ded09c':'#a3cd79');
    this.strip(-barrierWidth,barrierWidth,shoulder,-.06);
    this.strip(-width/2,width/2,asphalt,0);
    // Road sides are closed down to the ground, including on elevated courses.
    const positions=[],indices=[];
    for(const side of [-1,1])for(let i=0;i<=640;i++){
      const p=route.getPoint(i/640),x=p.x+Math.cos(p.heading)*barrierWidth*side,z=p.z-Math.sin(p.heading)*barrierWidth*side,n=positions.length/3;
      positions.push(x,p.y-.07,z,x,-.45,z);
      if(i<640)indices.push(n,n+1,n+2,n+1,n+3,n+2);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    this.mesh(g,this.mat(id==='lava'?'#655765':id==='city'?'#353e59':'#a5a788',{side:THREE.DoubleSide}));
    const edgeA=id==='city'?'#79dbdd':id==='lava'?'#ffac62':'#f5edcf',edgeB=id==='city'?'#7662b3':id==='lava'?'#654b5b':'#e17d66';
    const curbPositions=[],curbColors=[];
    const curbCount=Math.round(route.length/3);
    for(let i=0;i<curbCount;i++)for(const side of [-1,1]){
      const p=route.getPoint(i/curbCount);curbPositions.push({x:p.x+Math.cos(p.heading)*(width/2+.31)*side,y:p.y+.035,z:p.z-Math.sin(p.heading)*(width/2+.31)*side,sx:.62,sy:.09,sz:route.length/curbCount+.16,ry:p.heading});curbColors.push(i%2?edgeA:edgeB);
    }
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat('#ffffff',{roughness:.85}),curbPositions,curbColors,false);
    const markings=[];
    for(let i=0;i<route.length/11;i++){
      const p=route.getPoint(i*11/route.length);
      markings.push({x:p.x,y:p.y+.025,z:p.z,sx:.12,sy:.018,sz:2.1,ry:p.heading});
    }
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat(id==='city'?'#9aadc5':'#c4cdc2'),markings,null,false);
    if(id==='city'){
      this.strip(-barrierWidth+.05,-barrierWidth+.28,this.mat('#70e7e2',{emissive:'#3cd7d8',emissiveIntensity:.9}),.24);
      this.strip(barrierWidth-.28,barrierWidth-.05,this.mat('#bc8ce3',{emissive:'#b16bd9',emissiveIntensity:.8}),.24);
    }
    const barriers=[],colors=[],posts=[];
    const count=Math.ceil(route.length/5);
    for(let i=0;i<count;i++)for(const side of [-1,1]){
      const p=route.getPoint(i/count),x=p.x+Math.cos(p.heading)*(barrierWidth+.34)*side,z=p.z-Math.sin(p.heading)*(barrierWidth+.34)*side;
      barriers.push({x,y:p.y+.73,z,sx:.36,sy:1.10,sz:route.length/count+.24,ry:p.heading});
      colors.push(id==='coast'?'#eee2bd':id==='city'?(i%4<2?'#66618b':'#466d82'):id==='lava'?(i%4<2?'#a27d67':'#5e535d'):(i%5<3?'#f0eace':'#88af92'));
      posts.push({x,y:p.y+.64,z,sx:.52,sy:1.28,sz:.52,ry:p.heading});
    }
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat('#ffffff'),barriers,colors,true);
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat(id==='city'?'#3d4762':id==='lava'?'#514553':'#7a9682'),posts,null,true);
  }
  label(text,width,height,{color='#243b41',background='#f1eacb',font='900 70px sans-serif',border=null}={}){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.max(128,Math.round(1024*height/width));
    const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);
    if(border){ctx.strokeStyle=border;ctx.lineWidth=18;ctx.strokeRect(12,12,canvas.width-24,canvas.height-24);}
    ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=font;ctx.fillText(text,canvas.width/2,canvas.height/2,canvas.width*.92);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
    return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:texture,roughness:.8,side:THREE.DoubleSide}));
  }
  localGroup(t,lane=0,lift=0,alignGround=false){const p=this.route.getPoint(t),group=new THREE.Group();group.position.set(p.x+Math.cos(p.heading)*lane,p.y+lift,p.z-Math.sin(p.heading)*lane);const pitch=alignGround?-Math.atan2(this.route.getPoint(t+1/this.route.length).y-this.route.getPoint(t-1/this.route.length).y,2):0;group.rotation.set(pitch,p.heading,0,'YXZ');this.group.add(group);return group;}
  createFurniture(){
    const {route}=this,{width,id}=route;
    const arch=this.localGroup(0);
    const navy=this.mat('#314e50'),cream=this.mat('#f2ebce');
    for(const side of [-1,1]){
      this.box(.65,9.6,.65,side*(width/2+1.7),4.8,0,navy,0,arch);
      this.box(1.2,.38,1.2,side*(width/2+1.7),.19,0,cream,0,arch);
      this.box(.84,.22,.84,side*(width/2+1.7),8.35,0,cream,0,arch);
    }
    this.box(width+4.4,1.85,.64,0,9.33,0,cream,0,arch);
    const sign=this.label('KART RUSH  /  START',width+3.0,1.26,{color:'#244843',background:'#d4f18a',font:'900 64px sans-serif'});sign.position.set(0,9.34,-.34);sign.rotation.y=Math.PI;arch.add(sign);
    const reverse=this.label(route.definition.name,width+3.0,1.26,{color:'#244843',background:'#f2ebce',font:'900 64px sans-serif'});reverse.position.set(0,9.34,.34);arch.add(reverse);
    for(let x=0;x<12;x++)for(let z=0;z<3;z++)this.box(width/12,.035,.62,-width/2+width/24+x*width/12,.04,-.62+z*.62,(x+z)%2?'#f6eed4':'#354d51',0,arch);
    for(let row=0;row<3;row++)for(const side of [-1,1]){
      const grid=this.localGroup(1-(5+row*5)/route.length,side*3);
      this.box(2.55,.025,.12,0,.05,-1.55,'#d6dfc9',0,grid);
      for(const edge of [-1,1])this.box(.10,.025,1.1,edge*1.25,.05,-1.05,'#d6dfc9',0,grid);
    }
    const arrowShape=new THREE.Shape();arrowShape.moveTo(-1.22,-.90);arrowShape.lineTo(0,.2);arrowShape.lineTo(1.22,-.9);arrowShape.lineTo(1.22,-.34);arrowShape.lineTo(0,.77);arrowShape.lineTo(-1.22,-.34);arrowShape.closePath();
    const arrowGeo=new THREE.ShapeGeometry(arrowShape);
    for(const pad of route.boostPads){
      const group=this.localGroup(pad.t,pad.lane,.04,true);
      this.box(3.35,.06,7.2,0,0,0,this.mat(id==='lava'?'#d2704a':'#468f8c'),0,group);
      for(const side of [-1,1])this.box(.10,.08,7.2,side*1.68,.015,0,this.mat('#a7ffdc',{emissive:'#70ebc4',emissiveIntensity:.65}),0,group);
      for(let i=0;i<3;i++){const arrow=new THREE.Mesh(arrowGeo,this.mat('#bcffe2',{emissive:'#68dfa9',emissiveIntensity:.55}));arrow.rotation.x=-Math.PI/2;arrow.position.set(0,.048,i*1.75-1.75);group.add(arrow);}
    }
    for(const ramp of route.ramps){
      for(let i=0;i<3;i++){
        const p=this.localGroup(ramp.t-(5-i*2.1)/route.length,0,.075,true);
        for(const side of [-1,1]){const arrow=new THREE.Mesh(arrowGeo,this.mat('#f7df99'));arrow.rotation.x=-Math.PI/2;arrow.position.x=side*3.5;p.add(arrow);}
      }
      for(const side of [-1,1]){
        const p=this.localGroup(ramp.t-10/route.length,side*(route.barrierWidth+2));
        this.box(.12,2.9,.12,0,1.45,0,'#65756a',0,p);const board=this.label('↗',2.4,1.65,{font:'900 108px sans-serif',background:'#f5d789'});board.rotation.y=Math.PI;board.position.set(0,2.3,0);p.add(board);
      }
    }
    // Route-side signs are safely outside the collision corridor.
    for(let i=0;i<8;i++){
      const t=.055+i*.117,p=this.localGroup(t,route.barrierWidth+2.4);
      this.box(.15,2.3,.15,0,1.15,0,'#5f7770',0,p);
      const panel=this.label(i%2?'RUSH!':'›››',3.25,1.15,{color:'#f2ebce',background:id==='city'?'#554b81':'#315f58',font:'900 92px sans-serif'});panel.rotation.y=Math.PI;panel.position.set(0,2.32,0);p.add(panel);
    }
    if(id==='coast')this.createBridge(.31,39);
    if(id==='city')this.createTunnel(.275,39);
    if(id==='lava')this.createBridge(.465,45);
  }
  createBridge(t,length){
    const count=Math.ceil(length/5),planks=[],rails=[];
    for(let i=0;i<=count;i++){
      const p=this.route.getPoint(t+(i/count-.5)*length/this.route.length);
      for(const side of [-1,1]){
        const lane=side*(this.route.barrierWidth+.68),x=p.x+Math.cos(p.heading)*lane,z=p.z-Math.sin(p.heading)*lane;
        planks.push({x,y:p.y+1.2,z,sx:.45,sy:2.4,sz:.45,ry:p.heading});
        rails.push({x,y:p.y+1.90,z,sx:.22,sy:.20,sz:length/count+.3,ry:p.heading});
        rails.push({x,y:p.y+.9,z,sx:.22,sy:.20,sz:length/count+.3,ry:p.heading});
      }
    }
    const material=this.mat(this.route.id==='coast'?'#be9d72':'#9d8585');
    this.instance(new THREE.BoxGeometry(1,1,1),material,planks);this.instance(new THREE.BoxGeometry(1,1,1),material,rails);
    for(let i=0;i<3;i++){
      const p=this.route.getPoint(t+(i/2-.5)*length/this.route.length);
      for(const side of [-1,1])this.box(2,p.y+1,2,p.x+Math.cos(p.heading)*side*(this.route.width*.36),(p.y-1)/2,p.z-Math.sin(p.heading)*side*(this.route.width*.36),this.route.id==='coast'?'#b5a387':'#7b6a74',p.heading);
    }
  }
  createTunnel(t,length){
    const w=this.route.barrierWidth*2+2;
    for(let i=0;i<=9;i++){
      const group=this.localGroup(t+(i/9-.5)*length/this.route.length);
      const frame=this.mat(i%3===0?'#7dc7d4':'#555d7c',{emissive:i%3===0?'#4884a7':'#121629',emissiveIntensity:.25});
      for(const side of [-1,1])this.box(.75,9,.78,side*w/2,4.5,0,frame,0,group);
      this.box(w+1.0,.7,.78,0,9,0,frame,0,group);
      this.box(w+1,.23,length/9+.08,0,9.45,0,'#373d5c',0,group);
      for(const side of [-1,1])this.box(.15,.11,2.8,side*(w/2-1),8.55,0,this.mat(side>0?'#b184e9':'#65e6dd',{emissive:side>0?'#a062dc':'#44d5df',emissiveIntensity:.8}),0,group);
    }
  }
  createScenery(){
    if(this.route.id==='valley')this.createValley();
    else if(this.route.id==='coast')this.createCoast();
    else if(this.route.id==='city')this.createCity();
    else this.createLava();
  }
  createValley(){
    const trunks=[],foliage=[],leaves=[],bushes=[],flowers=[],flowerColors=[];
    const count=this.quality==='low'?82:135;
    for(let i=0;i<count;i++){
      const t=this.random(),p=this.route.getPoint(t),side=i%2?1:-1,lane=side*(this.route.barrierWidth+6+this.random()*33),x=p.x+Math.cos(p.heading)*lane,z=p.z-Math.sin(p.heading)*lane;
      if(this.route.project(x,z).distance<16)continue;
      const h=3.9+this.random()*4.2,s=1+this.random()*.6;
      trunks.push({x,y:h*.38,z,sx:.45,sy:h*.8,sz:.45});
      if(i%3){
        for(let k=0;k<3;k++)foliage.push({x,y:h*(.52+k*.21),z,sx:(2.5-k*.55)*s,sy:3.9*s,sz:(2.5-k*.55)*s,ry:this.random()});
      }else{
        for(let k=0;k<3;k++)leaves.push({x:x+Math.cos(k*TAU/3)*.65,y:h*(.77+k*.07),z:z+Math.sin(k*TAU/3)*.65,sx:2.5*s,sy:2.55*s,sz:2.45*s,ry:this.random()});
      }
      if(i%3===0)bushes.push({x:x+3,y:.6,z:z+1,sx:2.1,sy:1.2,sz:1.4});
      if(i<60){const pp=this.route.getPoint(t+.01),ll=side*(this.route.barrierWidth+2.1);for(let k=0;k<4;k++){flowers.push({x:pp.x+Math.cos(pp.heading)*ll+this.random()*1.4,y:.2+this.random()*.3,z:pp.z-Math.sin(pp.heading)*ll+this.random()*1.4,sx:.21,sy:.25,sz:.21});flowerColors.push(k%3?'#edcf76':'#fff1c4');}}
    }
    this.instance(new THREE.CylinderGeometry(1,1.25,1,6),this.mat('#916e50'),trunks);
    this.instance(new THREE.ConeGeometry(1,1,7),this.mat('#ffffff',{flatShading:true}),foliage,['#4e9472','#62ad7b','#80bd79']);
    this.instance(new THREE.IcosahedronGeometry(1,1),this.mat('#ffffff',{flatShading:true}),leaves,['#a2ca78','#85bd72','#76ac75']);
    this.instance(new THREE.DodecahedronGeometry(1,0),this.mat('#71ae76'),bushes);
    this.instance(new THREE.IcosahedronGeometry(1,0),this.mat('#ffffff'),flowers,flowerColors,false);
    const rocks=[];for(let i=0;i<36;i++){const p=this.route.getPoint(this.random()),lane=(i%2?1:-1)*(this.route.barrierWidth+4+this.random()*16),x=p.x+Math.cos(p.heading)*lane,z=p.z-Math.sin(p.heading)*lane;if(this.route.project(x,z).distance<16)continue;rocks.push({x,y:.1,z,sx:1+this.random()*1.9,sy:.7+this.random(),sz:1+this.random()*1.2,ry:this.random()*3});}
    this.instance(new THREE.DodecahedronGeometry(1,0),this.mat('#b7bba1',{flatShading:true}),rocks);
    this.createCamp(.76,-1);this.createWindmill(-8,22);
  }
  createCamp(t,side){
    const p=this.route.getPoint(t),lane=side*(this.route.barrierWidth+19),x=p.x+Math.cos(p.heading)*lane,z=p.z-Math.sin(p.heading)*lane;
    const group=new THREE.Group();group.position.set(x,.1,z);group.rotation.y=p.heading;this.group.add(group);
    this.box(5,3.2,4.5,0,1.6,0,'#f3d9a5',0,group);
    const roof=this.mesh(new THREE.ConeGeometry(4.5,2.2,4),this.mat('#cc7959'),0,4.28,0,group);roof.rotation.y=Math.PI/4;roof.scale.z=.9;
    this.box(1.05,2.1,.05,.55,1.08,2.27,'#658f88',0,group);
    this.box(1.1,.85,.08,-1.23,1.95,2.29,'#a0d7d2',0,group);
    for(const s of [-1,1])this.box(.23,2.8,.23,s*2.7,1.4,4.1,'#e8ce9e',0,group);
    this.box(6.2,.22,2.25,0,2.9,3.32,'#709e82',0,group);
    const sign=this.label('VALLEY PIT STOP',4.6,.74,{font:'900 90px sans-serif',color:'#f3eed4',background:'#43665b'});sign.position.set(0,3.25,2.49);group.add(sign);
  }
  createWindmill(x,z){
    if(this.route.project(x,z).distance<28)return;
    const tower=this.mesh(new THREE.CylinderGeometry(1.75,2.75,9,8),this.mat('#eadfc1'),x,4.5,z);
    this.mesh(new THREE.ConeGeometry(2.6,3.2,8),this.mat('#c27656'),x,10.25,z);
    const blades=new THREE.Group();blades.position.set(x,8.8,z+2.03);this.group.add(blades);
    for(let i=0;i<4;i++){const arm=new THREE.Group();arm.rotation.z=i*Math.PI/2;blades.add(arm);this.box(.25,6,.16,0,2,0,'#927450',0,arm);this.box(1.15,2.8,.12,.45,3.0,.08,'#eee4c5',0,arm);}
    this.mesh(new THREE.SphereGeometry(.38,8,6),this.mat('#d6b17b'),0,0,.2,blades);this.animated.push({object:blades,type:'windmill'});
  }
  createCoast(){
    const trunks=[],leaves=[],coconuts=[];
    for(let i=0;i<(this.quality==='low'?42:74);i++){
      const p=this.route.getPoint(this.random()),side=i%2?1:-1,lane=side*(this.route.barrierWidth+7+this.random()*23),x=p.x+Math.cos(p.heading)*lane,z=p.z-Math.sin(p.heading)*lane;
      if(this.route.project(x,z).distance<16||((x+15)/57)**2+((z-18)/48)**2<1)continue;
      const h=6+this.random()*4,tilt=(this.random()-.5)*.22;
      trunks.push({x,y:h*.49,z,sx:.4,sy:h,sz:.4,rz:tilt});
      for(let k=0;k<6;k++){const a=k*TAU/6;leaves.push({x:x+Math.cos(a)*1.65,y:h-.25,z:z+Math.sin(a)*1.65,sx:1.05,sy:.22,sz:4.6,rx:.15,ry:-a+Math.PI/2,rz:.06});}
      for(let k=0;k<3;k++)coconuts.push({x:x+Math.cos(k*TAU/3)*.40,y:h-.50,z:z+Math.sin(k*TAU/3)*.40,sx:.30,sy:.34,sz:.30});
    }
    this.instance(new THREE.CylinderGeometry(.77,1.2,1,7),this.mat('#b38c60'),trunks);
    this.instance(new THREE.SphereGeometry(1,7,4),this.mat('#ffffff',{flatShading:true}),leaves,['#6ca67b','#86bd81','#559575']);
    this.instance(new THREE.SphereGeometry(1,6,4),this.mat('#a17d55'),coconuts);
    for(let i=0;i<8;i++){
      const p=this.route.getPoint(.54+i*.042),lane=-(this.route.barrierWidth+15),x=p.x+Math.cos(p.heading)*lane,z=p.z-Math.sin(p.heading)*lane;
      if(((x+15)/59)**2+((z-18)/49)**2<1)continue;
      const color=['#ed9a88','#8ac5c6','#f0cb83','#b1add9'][i%4];
      this.box(3.4,2.5,3.5,x,1.25,z,color,p.heading);
      const roof=this.mesh(new THREE.ConeGeometry(2.9,1.45,4),this.mat('#f4e3be'),x,3.2,z);roof.rotation.y=p.heading+Math.PI/4;
      this.box(1.0,1.8,.12,x+Math.sin(p.heading)*1.80,1,z+Math.cos(p.heading)*1.80,'#fff1d1',p.heading);
      this.mesh(new THREE.CylinderGeometry(.075,.075,3.5,6),this.mat('#ddbe86'),x+5,1.5,z+1);
      const umbrella=this.mesh(new THREE.ConeGeometry(2.6,1.0,8),this.mat(color),x+5,3.4,z+1);umbrella.rotation.y=i;
      this.box(1.4,.30,2.8,x+5,.15,z+2.2,'#f5e8c3',p.heading);
    }
    // Decorative sailboats stay safely out on the open water.
    for(let i=0;i<4;i++){
      const a=1.8+i*.32,x=Math.cos(a)*220,z=Math.sin(a)*225,group=new THREE.Group();group.position.set(x,-1.8,z);group.rotation.y=a;this.group.add(group);
      const hull=this.mesh(new THREE.SphereGeometry(1,10,5),this.mat('#f6e7ce'),0,0,0,group);hull.scale.set(2,.65,5);
      this.mesh(new THREE.CylinderGeometry(.07,.07,8,6),this.mat('#b39b77'),0,4,0,group);
      const sailShape=new THREE.Shape();sailShape.moveTo(0,0);sailShape.lineTo(0,7);sailShape.lineTo(4.2,.4);sailShape.closePath();const sail=this.mesh(new THREE.ShapeGeometry(sailShape),this.mat('#ffeac6',{side:THREE.DoubleSide}),0,.8,0,group);sail.rotation.y=Math.PI/2;
    }
  }
  createCity(){
    const buildings=[],colors=[],windows=[],windowColors=[],caps=[];
    for(let i=0;i<(this.quality==='low'?76:116);i++){
      const x=(this.random()-.5)*440,z=(this.random()-.5)*450;
      if(this.route.project(x,z).distance<27||Math.hypot(x,z)<14)continue;
      const h=7+this.random()*39,w=7+this.random()*9,d=7+this.random()*9;
      buildings.push({x,y:h/2-.3,z,sx:w,sy:h,sz:d});colors.push(['#46506e','#3a415e','#565271','#3e516c','#605478'][i%5]);
      caps.push({x,y:h+.10,z,sx:w+.40,sy:.27,sz:d+.40});
      for(let floor=3;floor<h-1;floor+=4.1)for(let col=0;col<3;col++){
        if(this.random()<.24)continue;
        windows.push({x:x-w*.32+col*w*.32,y:floor,z:z+d/2+.025,sx:w*.19,sy:.56,sz:.035});windowColors.push(i%3?'#eacaa6':'#8fd1df');
        windows.push({x:x+w/2+.025,y:floor,z:z-d*.32+col*d*.32,sx:.035,sy:.56,sz:d*.19});windowColors.push(i%3?'#a4cadd':'#c49edb');
      }
    }
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat('#ffffff'),buildings,colors);
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat('#7c829e'),caps,null,false);
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat('#ffffff',{emissive:'#ffffff',emissiveIntensity:.35}),windows,windowColors,false);
    const poles=[],lamps=[];
    for(let i=0;i<32;i++){
      const p=this.route.getPoint(i/32),side=i%2?1:-1,lane=side*(this.route.barrierWidth+3),x=p.x+Math.cos(p.heading)*lane,z=p.z-Math.sin(p.heading)*lane;
      poles.push({x,y:p.y+3.5,z,sx:.17,sy:7,sz:.17});lamps.push({x,y:p.y+7.0,z,sx:1.3,sy:.22,sz:1.3});
    }
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat('#656e8e'),poles);
    this.instance(new THREE.BoxGeometry(1,1,1),this.mat('#b9eaf2',{emissive:'#8ed7eb',emissiveIntensity:.8}),lamps,null,false);
    for(let i=0;i<5;i++){
      const p=this.localGroup(.07+i*.19,this.route.barrierWidth+11);
      this.box(.4,9,.4,0,4.5,0,'#697194',0,p);
      const label=this.label(['NIGHT / SHIFT','RUSH DISTRICT','GO ELECTRIC','NEXT APEX','NEON CITY'][i],8,3.5,{background:i%2?'#3c5472':'#665286',color:i%2?'#9fedee':'#f4d2f1',font:'900 92px sans-serif',border:i%2?'#69dadb':'#cfa1ec'});label.position.set(0,8.3,0);label.rotation.y=Math.PI;p.add(label);
    }
  }
  createLava(){
    const rocks=[],colors=[],crystals=[];
    for(let i=0;i<(this.quality==='low'?87:137);i++){
      const p=this.route.getPoint(this.random()),side=i%2?1:-1,lane=side*(this.route.barrierWidth+6+this.random()*38),x=p.x+Math.cos(p.heading)*lane,z=p.z-Math.sin(p.heading)*lane;
      if(this.route.project(x,z).distance<17)continue;
      const s=1.0+this.random()*4.6;
      rocks.push({x,y:s*.4-.3,z,sx:s,sy:s*.8,sz:s*.83,ry:this.random()*TAU});colors.push(['#5c505d','#76636b','#918070','#4a414f'][i%4]);
      if(i%5===0)for(let k=0;k<3;k++)crystals.push({x:x+k*.8,y:s+1,z:z+.4,sx:.32,sy:1.3+this.random()*2,sz:.38,ry:this.random(),rz:(this.random()-.5)*.45});
    }
    this.instance(new THREE.DodecahedronGeometry(1,0),this.mat('#ffffff',{flatShading:true}),rocks,colors);
    this.instance(new THREE.OctahedronGeometry(1,0),this.mat('#ffac79',{emissive:'#f27b4f',emissiveIntensity:.5}),crystals,null,false);
    const steam=[];for(let i=0;i<14;i++){const a=this.random()*TAU,r=22+this.random()*22;steam.push({x:-15+Math.cos(a)*r,y:6+this.random()*5,z:4+Math.sin(a)*r,sx:1.5+this.random()*2,sy:.7+this.random(),sz:1.4+this.random()*2});}
    this.instance(new THREE.SphereGeometry(1,7,4),this.mat('#9c8480',{transparent:true,opacity:.3,depthWrite:false}),steam,null,false);
    for(let i=0;i<4;i++){
      const a=i*TAU/4+.3,r=135,x=Math.cos(a)*r,z=Math.sin(a)*r;
      if(this.route.project(x,z).distance<26)continue;
      const chimney=this.mesh(new THREE.CylinderGeometry(3.8,7.5,16,7),this.mat('#61515e'),x,7.5,z);chimney.rotation.y=i;
      const lip=this.mesh(new THREE.TorusGeometry(3.1,.7,6,8),this.mat('#f29b6c',{emissive:'#e46b3e',emissiveIntensity:.7}),x,15.4,z);lip.rotation.x=-Math.PI/2;
    }
  }
  batchScenery(){
    // Most decoration is already instanced. Merge the remaining fences, pads,
    // grid paint and architectural detail without touching animated objects.
    this.group.updateMatrixWorld(true);
    const batches=new Map(),originals=[],animated=new Set(this.animated.map(x=>x.object));
    this.group.traverse(object=>{
      if(!object.isMesh||object.isInstancedMesh||Array.isArray(object.material))return;
      let ancestor=object;while(ancestor&&ancestor!==this.group){if(animated.has(ancestor))return;ancestor=ancestor.parent;}
      const key=`${object.material.uuid}/${object.castShadow?1:0}`;
      if(!batches.has(key))batches.set(key,{material:object.material,castShadow:object.castShadow,geometries:[]});
      const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);batches.get(key).geometries.push(geometry);originals.push(object);
    });
    for(const batch of batches.values()){
      const geometry=mergeGeometries(batch.geometries,false);
      if(!geometry)throw new Error('Track scenery batching failed.');
      const mesh=new THREE.Mesh(geometry,batch.material);mesh.castShadow=batch.castShadow;mesh.receiveShadow=true;this.group.add(mesh);
      for(const g of batch.geometries)g.dispose();
    }
    const geometries=new Set();for(const object of originals){object.removeFromParent();geometries.add(object.geometry);}for(const geometry of geometries)geometry.dispose();
  }
  update(dt,time){for(const entry of this.animated)if(entry.type==='windmill')entry.object.rotation.z=time*.18;}
  dispose(){
    this.scene.remove(this.group);
    const geometries=new Set(),materials=new Set();this.group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const mat of Array.isArray(object.material)?object.material:[object.material])materials.add(mat);});
    for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of this.textures)texture.dispose();
    this.group.clear();this.materials.clear();this.animated.length=0;
  }
}
