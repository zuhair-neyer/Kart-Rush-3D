const TAU = Math.PI * 2;
const wrap = t => ((t % 1) + 1) % 1;

export const TRACKS = [
  { id: 'valley', name: 'GREEN VALLEY', tagline: 'A breath of fresh air. A burst of speed.', description: 'Rolling emerald hills, tall pines and a playful hilltop jump. Your perfect first circuit.', difficulty: 'Beginner', lengthLabel: '0.63 km', color: '#c9f569', sky: '#a6dced', ground: '#7ac66a', road: '#52686a', sun: '#fff2ce', width: 16 },
  { id: 'coast', name: 'SUNSET COAST', tagline: 'Chase the last light.', description: 'Sweep past turquoise water, pastel beach huts and a long seaside boardwalk.', difficulty: 'Easy', lengthLabel: '0.71 km', color: '#ffb186', sky: '#ffd5ab', ground: '#ead299', road: '#696e78', sun: '#ffb77d', width: 17 },
  { id: 'city', name: 'NEON CITY', tagline: 'Own the after-hours.', description: 'Electric blue boulevards, an illuminated tunnel and technical downtown corners.', difficulty: 'Technical', lengthLabel: '0.70 km', color: '#9a9cff', sky: '#151933', ground: '#262c48', road: '#343b54', sun: '#b2c7ff', width: 15 },
  { id: 'lava', name: 'LAVA PEAK', tagline: 'Keep your cool. Find your line.', description: 'A winding elevated circuit through glowing lava fields and volcanic rock.', difficulty: 'Expert', lengthLabel: '0.73 km', color: '#ff9271', sky: '#402e45', ground: '#493e4c', road: '#635964', sun: '#ffbe89', width: 15 },
];

const CONTROL_POINTS = {
  valley: [[0,-88],[65,-83],[106,-39],[100,27],[66,87],[8,96],[-60,78],[-98,28],[-86,-30],[-45,-49]],
  coast: [[-30,-94],[55,-100],[113,-62],[131,-5],[93,35],[61,40],[60,107],[-1,135],[-80,99],[-100,38],[-121,-17],[-96,-66]],
  city: [[0,-96],[72,-96],[111,-64],[111,-14],[62,18],[87,59],[79,108],[24,122],[-21,81],[-61,96],[-112,62],[-111,-10],[-68,-33],[-59,-83]],
  lava: [[0,-94],[67,-83],[103,-28],[77,20],[100,66],[63,115],[5,98],[-29,49],[-80,58],[-122,10],[-95,-42],[-48,-47]],
};

// Closed Catmull-Rom / cubic B-spline curves are resampled by arc length. The
// rounder B-spline keeps the wide coast and city shoulders from folding at an
// inner corner. Rendering and simulation always read this one route.
function sampleCurve(points, t, rounded=false) {
  const f = wrap(t) * points.length, i = Math.floor(f), u = f - i;
  const at = n => points[(n + points.length) % points.length];
  const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
  const value = k => rounded ? (p0[k]*(1-u)**3+p1[k]*(3*u**3-6*u*u+4)+p2[k]*(-3*u**3+3*u*u+3*u+1)+p3[k]*u**3)/6 : .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u + (-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u);
  return { x: value(0), z: value(1) };
}

export function createRoute(trackId = 'valley') {
  const definition = TRACKS.find(t => t.id === trackId) || TRACKS[0];
  const id = definition.id, resolution = 640;
  const raw = [], cumulative = [0];
  for (let i = 0; i <= resolution * 2; i++) {
    const p = sampleCurve(CONTROL_POINTS[id], i / (resolution * 2), id==='coast'||id==='city');
    raw.push(p);
    if (i) cumulative.push(cumulative[i - 1] + Math.hypot(p.x - raw[i-1].x, p.z - raw[i-1].z));
  }
  const length = cumulative[cumulative.length - 1];
  const samples = [];
  let cursor = 0;
  for (let i = 0; i < resolution; i++) {
    const distance = i / resolution * length;
    while (cursor < cumulative.length - 2 && cumulative[cursor + 1] < distance) cursor++;
    const a = raw[cursor], b = raw[cursor + 1];
    const u = (distance - cumulative[cursor]) / (cumulative[cursor + 1] - cumulative[cursor]);
    samples.push({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u});
  }
  const ramps = id === 'valley' ? [{t:.30,length:23,height:2.5}] : id === 'coast' ? [{t:.59,length:28,height:1.7}] : id === 'city' ? [{t:.82,length:24,height:1.5}] : [{t:.24,length:25,height:2.5},{t:.69,length:28,height:2.7}];
  const boostPads = [
    {t:.13,lane:-3}, {t:.39,lane:3}, {t:.65,lane:-3}, {t:.89,lane:3},
  ];
  function heightAt(t) {
    t = wrap(t);
    let h = id === 'valley' ? 2.4 + 1.25*Math.sin(TAU*t*2) + .55*Math.sin(TAU*t*3) :
      id === 'coast' ? 3.3 + 1.5*Math.sin(TAU*t-.2) :
      id === 'city' ? 2.8 + .75*Math.sin(TAU*t*2) :
      6 + 2.4*Math.sin(TAU*t*2+.3) + .7*Math.sin(TAU*t*3);
    for (const ramp of ramps) {
      const d = Math.min(wrap(t-ramp.t),wrap(ramp.t-t))*length;
      if (d < ramp.length*.5) h += ramp.height * .5 * (1 + Math.cos(d/ramp.length*TAU));
    }
    return h;
  }
  function getPoint(t) {
    t = wrap(t);
    const f = t*resolution, i = Math.floor(f), u = f-i;
    const a = samples[i], b = samples[(i+1)%resolution];
    const behind = samples[(i-1+resolution)%resolution], ahead = samples[(i+2)%resolution];
    const dx=(b.x-behind.x)*(1-u)+(ahead.x-a.x)*u;
    const dz=(b.z-behind.z)*(1-u)+(ahead.z-a.z)*u;
    return {x:a.x+(b.x-a.x)*u,y:heightAt(t),z:a.z+(b.z-a.z)*u,heading:Math.atan2(dx,dz)};
  }
  function project(x,z) {
    let best = Infinity, bestIndex = 0, bestU = 0, px=0, pz=0;
    for(let i=0;i<resolution;i++) {
      const a=samples[i], b=samples[(i+1)%resolution];
      const dx=b.x-a.x,dz=b.z-a.z;
      const u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
      const qx=a.x+dx*u,qz=a.z+dz*u,d=(x-qx)**2+(z-qz)**2;
      if(d<best){best=d;bestIndex=i;bestU=u;px=qx;pz=qz;}
    }
    const t=wrap((bestIndex+bestU)/resolution), point=getPoint(t);
    return {...point,t,lateral:(x-px)*Math.cos(point.heading)-(z-pz)*Math.sin(point.heading),distance:Math.sqrt(best)};
  }
  const bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
  for(const p of samples){bounds.minX=Math.min(bounds.minX,p.x);bounds.maxX=Math.max(bounds.maxX,p.x);bounds.minZ=Math.min(bounds.minZ,p.z);bounds.maxZ=Math.max(bounds.maxZ,p.z);}
  return {id,definition,length,width:definition.width,barrierWidth:definition.width/2+4,checkpoints:12,boostPads,ramps,getPoint,project,samples,bounds};
}
