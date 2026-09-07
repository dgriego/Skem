import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage=document.querySelector('#three-stage');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xeee7db);
const camera=new THREE.PerspectiveCamera(34,1,.01,50);camera.position.set(3.8,2.7,4.8);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;stage.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,0);controls.minDistance=1.4;controls.maxDistance=12;
scene.add(new THREE.HemisphereLight(0xfffbf3,0x81796d,2));const key=new THREE.DirectionalLight(0xffffff,1.8);key.position.set(3,5,4);scene.add(key);const rim=new THREE.DirectionalLight(0xe7dfd2,.8);rim.position.set(-4,3,-3);scene.add(rim);
const grid=new THREE.GridHelper(8,16,0xb3a999,0xd8cec0);grid.position.y=-1.55;scene.add(grid);

const materials={clay:new THREE.MeshStandardMaterial({color:0x938b7d,roughness:.95,metalness:0,side:THREE.DoubleSide}),silhouette:new THREE.MeshBasicMaterial({color:0x272721,side:THREE.DoubleSide}),wire:new THREE.MeshBasicMaterial({color:0x403d37,wireframe:true,side:THREE.DoubleSide})};
const guideMat=new THREE.LineBasicMaterial({color:0xdd603f});const contourMat=new THREE.LineBasicMaterial({color:0x5d584f});

const DEFINITIONS={
  ovoid:{label:'Ovoid',desc:'head / organic point mass',rule:'Simple egg with readable front direction',defaults:{width:1.05,height:1.45,depth:.95,top:.86,middle:1,bottom:.72,taper:.12,bulge:.08,squash:0,bow:0,shear:0}},
  barrel:{label:'Barrel',desc:'rib cage / large organic mass',rule:'Fullest in the upper-middle, narrower at both ends',defaults:{width:1.6,height:2.1,depth:1.25,top:.82,middle:1,bottom:.68,taper:.12,bulge:.18,squash:.02,bow:0,shear:.03}},
  wedge:{label:'Wedge',desc:'pelvis / hand / foot plane mass',rule:'Clear front, side, top, and directional taper',defaults:{width:1.65,height:1.15,depth:1.15,top:1,middle:.9,bottom:.66,taper:.22,bulge:0,squash:0,bow:0,shear:.12}},
  cylinder:{label:'Tapered Cylinder',desc:'limbs / connectors',rule:'Long, clean, and obviously tapered',defaults:{width:.72,height:2.6,depth:.72,top:1,middle:.9,bottom:.58,taper:.3,bulge:.06,squash:0,bow:.06,shear:0}},
  ball:{label:'Ball',desc:'joint indicator',rule:'Small connection mass, never the star of the form',defaults:{width:.9,height:.9,depth:.9,top:1,middle:1,bottom:1,taper:0,bulge:0,squash:0,bow:0,shear:0}}
};

let formType='barrel';let params={...DEFINITIONS[formType].defaults};let root=new THREE.Group();scene.add(root);let mesh=null,axisGroup=null,contourGroup=null;

function profileRadius(t){
  const p=params;let base;
  if(t<.5){const u=t/.5;base=THREE.MathUtils.lerp(p.bottom,p.middle,u)}else{const u=(t-.5)/.5;base=THREE.MathUtils.lerp(p.middle,p.top,u)}
  const bulge=1+p.bulge*Math.sin(Math.PI*t);const taper=1-p.taper*Math.max(0,t-.5)*.55;return Math.max(.04,base*bulge*taper);
}
function radialGeometry(kind){
  if(kind==='ball') return new THREE.SphereGeometry(.5,36,28);
  const pts=[];const steps=20;
  for(let i=0;i<=steps;i++){const t=i/steps;const y=(t-.5)*params.height;let r=profileRadius(t)*.5*params.width;if(kind==='ovoid')r*=Math.sin(Math.PI*Math.min(.999,Math.max(.001,t)))**.42;pts.push(new THREE.Vector2(Math.max(.015,r),y));}
  return new THREE.LatheGeometry(pts,48);
}
function makeWedge(){
  const p=params;const hw=p.width/2,hh=p.height/2,hd=p.depth/2;const bw=hw*p.bottom,bd=hd*(.7+p.bottom*.25);const tw=hw*p.top,td=hd;const sy=p.shear*.5;
  const v=[[-bw,-hh,-bd],[bw,-hh,-bd],[bw,-hh,bd],[-bw,-hh,bd],[-tw+sy,hh,-td],[tw+sy,hh,-td],[tw+sy,hh,td],[-tw+sy,hh,td]];
  const pos=[];const faces=[[0,1,2,0,2,3],[4,6,5,4,7,6],[0,4,5,0,5,1],[1,5,6,1,6,2],[2,6,7,2,7,3],[3,7,4,3,4,0]];faces.flat().forEach(i=>pos.push(...v[i]));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;
}
function deformGeometry(g){
  const a=g.attributes.position;const p=params;for(let i=0;i<a.count;i++){let x=a.getX(i),y=a.getY(i),z=a.getZ(i);const ny=y/(p.height||1);x+=p.shear*ny;x+=p.bow*Math.sin((ny+.5)*Math.PI);z*=p.depth/(p.width||1);y*=1-p.squash*.25;a.setXYZ(i,x,y,z);}a.needsUpdate=true;g.computeVertexNormals();return g;
}
function buildGuides(){
  axisGroup=new THREE.Group();contourGroup=new THREE.Group();root.add(axisGroup,contourGroup);
  const axisGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-params.height*.62,0),new THREE.Vector3(0,params.height*.62,0)]);axisGroup.add(new THREE.Line(axisGeo,guideMat));
  const frontGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,params.depth*.72)]);axisGroup.add(new THREE.Line(frontGeo,guideMat));
  [-.28,0,.28].forEach(frac=>{const y=frac*params.height;let rx=params.width*.5*(formType==='wedge'?THREE.MathUtils.lerp(params.bottom,params.top,frac+.5):profileRadius(frac+.5));let rz=params.depth*.5*(formType==='wedge'?THREE.MathUtils.lerp(params.bottom*.8,params.top,frac+.5):profileRadius(frac+.5));const pts=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*rx,y,Math.sin(a)*rz));}contourGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),contourMat));});
}
function rebuild(){
  while(root.children.length)root.remove(root.children[0]);
  let g=formType==='wedge'?makeWedge():radialGeometry(formType);g=deformGeometry(g);mesh=new THREE.Mesh(g,materials.clay);root.add(mesh);buildGuides();updateDisplay();updateReadout();
}
function updateDisplay(){
  const silhouette=document.querySelector('#silhouette-toggle').checked;const wire=document.querySelector('#wire-toggle').checked;mesh.material=silhouette?materials.silhouette:wire?materials.wire:materials.clay;axisGroup.visible=document.querySelector('#axis-toggle').checked&&!silhouette;contourGroup.visible=document.querySelector('#contour-toggle').checked&&!silhouette;
}
function addRange(container,key,label,min,max,step,help){const row=document.createElement('div');row.className='range-row';row.innerHTML=`<label>${label}<small>${help}</small></label><output>${params[key].toFixed(2)}</output><input type="range" min="${min}" max="${max}" step="${step}" value="${params[key]}">`;const input=row.querySelector('input'),out=row.querySelector('output');input.oninput=()=>{params[key]=Number(input.value);out.textContent=params[key].toFixed(2);rebuild();};container.appendChild(row);}
function renderControls(){
  const f=document.querySelector('#form-list');f.innerHTML='';Object.entries(DEFINITIONS).forEach(([id,d])=>{const b=document.createElement('button');b.className='form-button'+(id===formType?' active':'');b.innerHTML=`<b>${d.label}</b><small>${d.desc}</small>`;b.onclick=()=>{formType=id;params={...DEFINITIONS[id].defaults};renderControls();rebuild();};f.appendChild(b);});
  document.querySelector('#form-title').textContent=DEFINITIONS[formType].label;document.querySelector('#form-desc').textContent=DEFINITIONS[formType].desc;document.querySelector('#hud-rule').textContent=DEFINITIONS[formType].rule;
  const p=document.querySelector('#proportion-controls');p.innerHTML='';addRange(p,'width','Width',.4,2.6,.02,'overall side-to-side size');addRange(p,'height','Height',.5,3.6,.02,'major vertical proportion');addRange(p,'depth','Depth',.35,2.4,.02,'front-to-back size');
  const pr=document.querySelector('#profile-controls');pr.innerHTML='';addRange(pr,'top','Top width',.35,1.4,.01,'relative width at the top');addRange(pr,'middle','Middle width',.45,1.5,.01,'relative fullest section');addRange(pr,'bottom','Bottom width',.25,1.3,.01,'relative width at the base');
  const c=document.querySelector('#character-controls');c.innerHTML='';addRange(c,'taper','Taper',0,.65,.01,'narrows toward one end');addRange(c,'bulge','Bulge',-.2,.45,.01,'adds or removes fullness');addRange(c,'squash','Squash',-.4,.5,.01,'flattens the vertical dimension');addRange(c,'bow','Bow',-.4,.4,.01,'curves the center path');addRange(c,'shear','Shear',-.5,.5,.01,'shifts top relative to bottom');
}
function updateReadout(){document.querySelector('#value-readout').textContent=JSON.stringify({form:formType,...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,Number(v.toFixed(2))]))},null,2);}
['axis-toggle','contour-toggle','wire-toggle','silhouette-toggle'].forEach(id=>document.querySelector('#'+id).onchange=()=>{if(id==='wire-toggle'&&document.querySelector('#wire-toggle').checked)document.querySelector('#silhouette-toggle').checked=false;if(id==='silhouette-toggle'&&document.querySelector('#silhouette-toggle').checked)document.querySelector('#wire-toggle').checked=false;updateDisplay();});
document.querySelector('#reset-view').onclick=()=>{camera.position.set(3.8,2.7,4.8);controls.target.set(0,0,0);controls.update();};document.querySelector('#reset-form').onclick=()=>{params={...DEFINITIONS[formType].defaults};renderControls();rebuild();};document.querySelector('#copy-values').onclick=async()=>{const text=document.querySelector('#value-readout').textContent;try{await navigator.clipboard.writeText(text);const b=document.querySelector('#copy-values');b.textContent='Copied';setTimeout(()=>b.textContent='Copy values',900);}catch{}};
function resize(){const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);
renderControls();rebuild();resize();
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
