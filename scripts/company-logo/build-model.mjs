import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};

const assembly=JSON.parse(await readFile(new URL('./assembly.json',import.meta.url),'utf8'));
const film=JSON.parse(await readFile(new URL('./film-motion.json',import.meta.url),'utf8'));
const output=process.argv[2] || fileURLToPath(new URL('../../src/assets/models/company/',import.meta.url));
await mkdir(output,{recursive:true});
const {center:[cx,cy],pixelScale:sc,fps,frames}=film.reference;
const scene=new THREE.Scene(); scene.name='RDT_constrained_planar_assembly';
const root=new THREE.Group(); root.name='RDT_logo'; scene.add(root);
const tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.acos(assembly.tiltCos));
root.quaternion.copy(tilt);
const front=new THREE.MeshPhysicalMaterial({color:'#0b326c',metalness:.32,roughness:.28,clearcoat:.16,clearcoatRoughness:.22});
front.name='RDT_blue_face';
const edge=new THREE.MeshPhysicalMaterial({color:'#b6d8f8',metalness:.60,roughness:.23,clearcoat:.25,clearcoatRoughness:.20});
edge.name='RDT_ice_metal_edge';
const times=Array.from({length:frames},(_,i)=>i/fps);
const tracks=[];
const duration=times.at(-1);
const toPoint=([x,y])=>new THREE.Vector2(x,y);
const smoothstep=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const opening=p=>p<.36?1-smoothstep(0,.36,p):p>.74?smoothstep(.74,1,p):0;

for(const seam of assembly.seams) {
  for(const name of seam.parts) {
    const profile=assembly.parts.find(p=>p.name===name);
    assert(profile,`missing part ${name}`);
    for(const point of seam.points)assert(profile.outer.some(p=>Math.hypot(p[0]-point[0],p[1]-point[1])<1e-9),`unmatched joint vertex in ${name}`);
  }
}

function smooth(values,index,channel) {
  if(index===0)return values[0][channel];
  const weights=[1,2,3,2,1];
  return weights.reduce((sum,w,k)=>sum+w*values[THREE.MathUtils.clamp(index+k-2,0,values.length-1)][channel],0)/9;
}

// Only curved wall runs blend their normals. All front triangles remain flat
// and every mating face is an exact extrusion of its shared straight segment.
function smoothWallNormals(geometry,shape) {
  const edges=[];
  for(const [h,raw] of [shape.getPoints(),...shape.holes.map(v=>v.getPoints())].entries()) {
    const points=raw.slice();
    if(points[0].distanceTo(points.at(-1))<1e-8)points.pop();
    const area=points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a.x*b.y-b.x*a.y;},0);
    const sign=(area>0?1:-1)*(h===0?1:-1);
    const ns=points.map((a,i)=>{const b=points[(i+1)%points.length];return new THREE.Vector2((b.y-a.y)*sign,(a.x-b.x)*sign).normalize();});
    for(let i=0;i<points.length;i++) {
      const n=ns[i],prev=ns[(i+points.length-1)%points.length],next=ns[(i+1)%points.length];
      edges.push({a:points[i],b:points[(i+1)%points.length],n0:n.dot(prev)>.95?n.clone().add(prev).normalize():n,n1:n.dot(next)>.95?n.clone().add(next).normalize():n});
    }
  }
  const pos=geometry.attributes.position,norm=geometry.attributes.normal;
  for(const group of geometry.groups) {
    if(group.materialIndex!==1)continue;
    for(let i=group.start;i<group.start+group.count;i++) {
      const x=pos.getX(i),y=pos.getY(i);
      let best=Infinity,normal;
      for(const e of edges) {
        const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y;
        const t=THREE.MathUtils.clamp(((x-e.a.x)*dx+(y-e.a.y)*dy)/(dx*dx+dy*dy),0,1);
        const d=(x-e.a.x-dx*t)**2+(y-e.a.y-dy*t)**2;
        if(d<best) {best=d;normal=e.n0.clone().lerp(e.n1,t).normalize();}
      }
      norm.setXYZ(i,normal.x,normal.y,0);
    }
  }
}

let solidVolume=0;
for(const part of assembly.parts) {
  const outline=part.outer.map(toPoint);
  if(!THREE.ShapeUtils.isClockWise(outline))outline.reverse();
  const shape=new THREE.Shape(outline);
  for(const hole of part.holes) {
    const points=hole.map(toPoint);
    // ExtrudeGeometry only conditionally normalizes holes when it reverses
    // the outer loop. Supply both windings explicitly, including inner walls.
    if(THREE.ShapeUtils.isClockWise(points))points.reverse();
    shape.holes.push(new THREE.Path(points));
  }
  // Bevel expansion would push adjacent solids through each other. Mating
  // edges are square, so both the cap and the full wall obey the same outline.
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:assembly.depth,steps:1,bevelEnabled:false});
  smoothWallNormals(geometry,shape);
  geometry.translate(0,0,-assembly.depth);
  const vertices=geometry.attributes.position;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  let volume=0;
  for(let i=0;i<vertices.count;i+=3) {
    a.fromBufferAttribute(vertices,i);b.fromBufferAttribute(vertices,i+1);c.fromBufferAttribute(vertices,i+2);
    volume+=a.dot(b.cross(c))/6;
  }
  const area=Math.abs(THREE.ShapeUtils.area(outline))-part.holes.reduce((s,h)=>s+Math.abs(THREE.ShapeUtils.area(h.map(toPoint))),0);
  assert(Math.abs(volume-area*assembly.depth)<1e-5,`invalid closed volume in ${part.name}`);
  solidVolume+=volume;
  const mesh=new THREE.Mesh(geometry,[front,edge]);
  mesh.name=`RDT_${part.name.replaceAll('-','_')}`;
  mesh.userData={profile:part.name,frontPlane:0,construction:'Shared constrained profile, square mating faces, constant depth'};
  mesh.castShadow=true;
  root.add(mesh);
  const positions=[];
  for(let i=0;i<frames;i++) {
    const amount=opening(i/(frames-1));
    positions.push(part.open[0]*amount,part.open[1]*amount,0);
  }
  // There are no per-part rotations, scale changes or out-of-plane offsets.
  tracks.push(new THREE.VectorKeyframeTrack(`${mesh.name}.position`,times,positions));
}

const positions=[],quaternions=[],scales=[];
const globalFrames=[];
for(let i=0;i<frames;i++) {
  const global=film.parts.map(p=>Array.from({length:6},(_,k)=>smooth(p.motion,i,k)));
  const mean=fn=>global.reduce((s,m)=>s+fn(m),0)/global.length;
  const size=mean(([a,, ,c])=>Math.hypot(a,c));
  const angle=-mean(([a,, ,c])=>Math.atan2(c,a));
  globalFrames.push({x:mean(([a,b,tx])=>(a*cx+b*cy+tx-cx)*sc),y:mean(([, , ,c,d,ty])=>-(c*cx+d*cy+ty-cy)*sc),size,angle});
}
// The source movie's last frame drifts slightly from its first. Remove that
// drift on the common parent, preserving all constrained piece geometry.
const first=globalFrames[0],last=globalFrames.at(-1);
for(let i=0;i<frames;i++) {
  const correction=smoothstep(0,1,i/(frames-1));
  const source=globalFrames[i];
  const x=source.x-(last.x-first.x)*correction;
  const y=source.y-(last.y-first.y)*correction;
  const size=source.size-(last.size-first.size)*correction;
  const angle=source.angle-(last.angle-first.angle)*correction;
  positions.push(x,y,0);
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle).multiply(tilt);
  quaternions.push(q.x,q.y,q.z,q.w);
  scales.push(size,size,size);
}
tracks.push(new THREE.VectorKeyframeTrack('RDT_logo.position',times,positions));
tracks.push(new THREE.QuaternionKeyframeTrack('RDT_logo.quaternion',times,quaternions));
tracks.push(new THREE.VectorKeyframeTrack('RDT_logo.scale',times,scales));
const clip=new THREE.AnimationClip('Styled_film_constrained_assembly',duration,tracks);

// Verify the actual animated scene, including inherited transforms. Every
// visible cap must lie in one plane, even before the parts have finished moving.
const mixer=new THREE.AnimationMixer(scene);
const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
const zAxis=new THREE.Vector3(0,0,1);
let planeError=0,closedError=0;
for(let i=0;i<=120;i++) {
  action.paused=false;action.enabled=true;mixer.setTime(duration*i/120);scene.updateMatrixWorld(true);
  const normal=zAxis.clone().applyQuaternion(root.quaternion),origin=root.position;
  for(const part of root.children) {
    const p=new THREE.Vector3(0,0,0).applyMatrix4(part.matrixWorld);
    planeError=Math.max(planeError,Math.abs(p.sub(origin).dot(normal)));
    if(i/120>=.38&&i/120<=.72)closedError=Math.max(closedError,part.position.length());
  }
}
assert(planeError<1e-8,`cap plane error ${planeError}`);
assert(closedError===0,`assembled joint error ${closedError}`);
for(const track of tracks) {
  const size=track.getValueSize();
  for(let c=0;c<size;c++)assert(Math.abs(track.values[c]-track.values[track.values.length-size+c])<1e-6,`loop seam in ${track.name}`);
}
mixer.stopAllAction();mixer.uncacheRoot(scene);
for(const p of root.children){p.position.set(0,0,0);p.quaternion.identity();p.scale.set(1,1,1);}
root.position.set(0,0,0);root.quaternion.copy(tilt);root.scale.set(1,1,1);
scene.userData={
  reference:assembly.reference,
  note:'Six exact mating solids. Default static pose is assembled. One common root controls the film pose; parts only translate in the common XY plane.',
  assembledInterval:[.36,.74],seamlessLoop:true,frontPlane:0,depth:assembly.depth,
  validation:{...assembly.validation,maxAnimatedPlaneError:planeError,assembledOffset:closedError,solidVolume},
};
const binary=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[clip],trs:true});
await writeFile(path.join(output,'rdt-logo.glb'),Buffer.from(binary));
console.log(JSON.stringify({bytes:binary.byteLength,meshes:root.children.length,triangles:root.children.reduce((s,c)=>s+c.geometry.attributes.position.count/3,0),animationChannels:tracks.length,...scene.userData.validation},null,2));
