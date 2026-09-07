import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage=document.querySelector('#three-stage');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xeee7db);
const camera=new THREE.PerspectiveCamera(32,1,.01,30);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;stage.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1.2;controls.maxDistance=6;controls.target.set(0,.95,0);
scene.add(new THREE.HemisphereLight(0xfffbf3,0x81796d,2.1));const key=new THREE.DirectionalLight(0xffffff,2.15);key.position.set(2.8,4.3,3.2);scene.add(key);const fill=new THREE.DirectionalLight(0xe9e3d8,.8);fill.position.set(-3,2,-2);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshStandardMaterial({color:0xd8cfc1,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;scene.add(floor);

const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
const matForm=new THREE.MeshStandardMaterial({color:0xaaa397,roughness:.96});
const matJoint=new THREE.MeshStandardMaterial({color:0xb7afa1,roughness:.96});
const matSil=new THREE.MeshBasicMaterial({color:0x272721});
const matWire=new THREE.MeshBasicMaterial({color:0x4a473f,wireframe:true});
const lineMat=new THREE.LineBasicMaterial({color:0x38372f,transparent:true,opacity:.78});
const accentMat=new THREE.LineBasicMaterial({color:0xdd603f,transparent:true,opacity:.92});
let figure=null,contours=null,displayMode='forms';

const POSES={
neutral:{title:'Neutral construction',torso:[0,0,0],pelvis:[0,0,0],head:[0,0,0],p:{head:V(0,1.665),neck:V(0,1.515),chest:V(0,1.305),pelvis:V(0,.985),sL:V(-.285,1.435),sR:V(.285,1.435),eL:V(-.365,1.125),eR:V(.365,1.125),wL:V(-.37,.855),wR:V(.37,.855),hL:V(-.15,.955),hR:V(.15,.955),kL:V(-.145,.515),kR:V(.145,.515),aL:V(-.135,.105),aR:V(.135,.105),handL:V(-.37,.76,.01),handR:V(.37,.76,.01),footL:V(-.135,.055,.115),footR:V(.135,.055,.115)}},
contrapposto:{title:'Contrapposto construction',torso:[0,-.08,-.07],pelvis:[0,.08,.10],head:[0,.05,.025],p:{head:V(.01,1.665),neck:V(0,1.515),chest:V(-.015,1.305),pelvis:V(.025,.985),sL:V(-.295,1.455,.015),sR:V(.275,1.415,-.005),eL:V(-.35,1.13,.02),eR:V(.385,1.11,-.015),wL:V(-.33,.86,.035),wR:V(.40,.845,-.03),hL:V(-.135,.97,.005),hR:V(.18,.94,-.005),kL:V(-.12,.515,.01),kR:V(.205,.53,-.025),aL:V(-.105,.105),aR:V(.235,.115,-.04),handL:V(-.325,.76,.04),handR:V(.405,.75,-.03),footL:V(-.105,.055,.12),footR:V(.235,.06,.08)}},
reach:{title:'Reach construction',torso:[-.06,-.16,-.10],pelvis:[0,.08,.05],head:[-.05,.08,-.03],p:{head:V(.015,1.675,-.005),neck:V(0,1.52),chest:V(-.025,1.31,.01),pelvis:V(.035,.985),sL:V(-.30,1.43,.03),sR:V(.27,1.47,-.01),eL:V(-.39,1.10,.06),eR:V(.34,1.68,-.04),wL:V(-.38,.84,.08),wR:V(.36,1.90,-.10),hL:V(-.145,.96,.015),hR:V(.18,.95,-.02),kL:V(-.17,.515,.03),kR:V(.22,.54,-.05),aL:V(-.15,.105,.02),aR:V(.28,.115,-.08),handL:V(-.37,.75,.09),handR:V(.36,2.00,-.11),footL:V(-.15,.055,.13),footR:V(.28,.06,.06)}}
};

function sphere(r,mat=matJoint,seg=20){return new THREE.Mesh(new THREE.SphereGeometry(r,seg,Math.max(12,seg-4)),mat)}
function ellipsoid(scale,mat=matForm){const m=sphere(1,mat,28);m.scale.copy(scale);return m}
function cylinderBetween(a,b,rA,rB,mat=matForm){const d=b.clone().sub(a),len=d.length();const m=new THREE.Mesh(new THREE.CylinderGeometry(rB,rA,len,18,1,false),mat);m.position.copy(a.clone().add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return m}
function box(size,mat=matForm){return new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z,2,2,2),mat)}
function circleLine(r=1,mat=lineMat,segments=64){const pts=[];for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;pts.push(V(Math.cos(a)*r,Math.sin(a)*r,0))}return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),mat)}
function line(a,b,mat=accentMat){return new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),mat)}
function addContour(parent,center,scale,euler,axis='z',mat=lineMat){const l=circleLine(1,mat);l.position.copy(center);l.scale.set(scale.x,scale.y,scale.z||1);l.rotation.set(...euler);if(axis==='x')l.rotation.y+=Math.PI/2;if(axis==='y')l.rotation.x+=Math.PI/2;parent.add(l)}

function buildFigure(id){
  if(figure)scene.remove(figure);
  const pose=POSES[id],p=pose.p;figure=new THREE.Group();figure.userData.meshes=[];contours=new THREE.Group();figure.add(contours);
  const add=m=>{figure.add(m);figure.userData.meshes.push(m);return m};

  const head=add(ellipsoid(V(.092,.118,.102)));head.position.copy(p.head);head.rotation.set(...pose.head);
  add(cylinderBetween(p.neck.clone().add(V(0,.04)),p.neck.clone().add(V(0,-.06)),.058,.066));

  const rib=add(ellipsoid(V(.245,.285,.17)));rib.position.copy(p.chest);rib.rotation.set(...pose.torso);
  const upperRib=add(ellipsoid(V(.255,.16,.175)));upperRib.position.copy(p.chest.clone().add(V(0,.09)));upperRib.rotation.set(...pose.torso);

  const pelvis=add(box(V(.34,.205,.245)));pelvis.position.copy(p.pelvis);pelvis.rotation.set(...pose.pelvis);
  const hipMassL=add(ellipsoid(V(.11,.12,.13)));hipMassL.position.copy(p.hL.clone().lerp(p.pelvis,.45));
  const hipMassR=add(ellipsoid(V(.11,.12,.13)));hipMassR.position.copy(p.hR.clone().lerp(p.pelvis,.45));

  contours.add(line(p.neck,p.chest),line(p.chest,p.pelvis),line(p.sL,p.sR,lineMat),line(p.hL,p.hR,lineMat));

  const joints=[p.sL,p.sR,p.eL,p.eR,p.wL,p.wR,p.hL,p.hR,p.kL,p.kR,p.aL,p.aR];
  const radii=[.064,.064,.052,.052,.038,.038,.07,.07,.06,.06,.038,.038];
  joints.forEach((pt,i)=>{const j=add(sphere(radii[i]));j.position.copy(pt)});

  add(cylinderBetween(p.sL,p.eL,.067,.052));add(cylinderBetween(p.eL,p.wL,.05,.034));
  add(cylinderBetween(p.sR,p.eR,.067,.052));add(cylinderBetween(p.eR,p.wR,.05,.034));
  add(cylinderBetween(p.hL,p.kL,.095,.064));add(cylinderBetween(p.kL,p.aL,.07,.042));
  add(cylinderBetween(p.hR,p.kR,.095,.064));add(cylinderBetween(p.kR,p.aR,.07,.042));

  [[p.handL,-.03],[p.handR,.03]].forEach(([pt,rz])=>{const h=add(box(V(.075,.145,.055)));h.position.copy(pt);h.rotation.z=rz});
  [p.footL,p.footR].forEach(pt=>{const f=add(box(V(.105,.075,.25)));f.position.copy(pt);f.rotation.x=-.05});

  addContour(contours,p.head,V(.095,.105,1),pose.head,'z');addContour(contours,p.head,V(.095,.105,1),pose.head,'x');
  addContour(contours,p.chest,V(.235,.18,1),pose.torso,'z');addContour(contours,p.chest,V(.17,.27,1),pose.torso,'x');
  addContour(contours,p.pelvis,V(.17,.10,1),pose.pelvis,'z');

  [[p.sL,p.eL,.052],[p.eL,p.wL,.038],[p.sR,p.eR,.052],[p.eR,p.wR,.038],[p.hL,p.kL,.072],[p.kL,p.aL,.05],[p.hR,p.kR,.072],[p.kR,p.aR,.05]].forEach(([a,b,r])=>{const mid=a.clone().lerp(b,.52),dir=b.clone().sub(a).normalize(),ring=circleLine(r,lineMat,36);ring.position.copy(mid);ring.quaternion.setFromUnitVectors(V(0,0,1),dir);contours.add(ring)});

  scene.add(figure);document.querySelector('#pose-title').textContent=pose.title;applyDisplay();
}

function applyDisplay(){if(!figure)return;const override=displayMode==='forms'?null:displayMode==='silhouette'?matSil:matWire;figure.userData.meshes.forEach(m=>m.material=override||(m.geometry.type==='SphereGeometry'&&Math.abs(m.scale.x-m.scale.y)<.001?matJoint:matForm));contours.visible=displayMode!=='silhouette'&&document.querySelector('#contour-toggle').checked}

const views={front:[0,1,3.25],three:[2.45,1.16,2.65],side:[3.25,1,0],back:[0,1,-3.25]};
function setView(name){const v=views[name]||views.three;camera.position.set(...v);controls.target.set(0,.96,0);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name))}

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelector('#reset-camera').onclick=()=>setView('three');
document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-pose]').forEach(x=>x.classList.toggle('active',x===b));buildFigure(b.dataset.pose)});
document.querySelectorAll('[data-display]').forEach(b=>b.onclick=()=>{displayMode=b.dataset.display;document.querySelectorAll('[data-display]').forEach(x=>x.classList.toggle('active',x===b));applyDisplay()});
document.querySelector('#contour-toggle').onchange=e=>{if(contours)contours.visible=e.target.checked&&displayMode!=='silhouette'};

const guideToggle=document.querySelector('#guide-toggle');let guide=null;guideToggle.onchange=()=>{if(guide){guide.remove();guide=null}if(!guideToggle.checked)return;guide=document.createElement('div');guide.className='head-guide';const top=5,bottom=94,step=(bottom-top)/8;for(let i=0;i<=8;i++){const l=document.createElement('div');l.style.top=`${top+i*step}%`;guide.appendChild(l);if(i<8){const s=document.createElement('span');s.style.top=`${top+(i+.5)*step}%`;s.textContent=`${i+1}`;guide.appendChild(s)}}document.querySelector('.stage-card').appendChild(guide)};

function resize(){const w=Math.max(stage.clientWidth,1),h=Math.max(stage.clientHeight,1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();
buildFigure('neutral');setView('three');
(function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)})();
