import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const stage = document.querySelector('#three-stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeee7db);

const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1.1;
controls.maxDistance = 5;
controls.target.set(0, .92, 0);

scene.add(new THREE.HemisphereLight(0xfffbf3, 0x81796d, 2.0));
const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(2.5,4,3); scene.add(key);
const fill = new THREE.DirectionalLight(0xe9e3d8, .9); fill.position.set(-3,2,-2); scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(5,5),
  new THREE.MeshStandardMaterial({color:0xd8cfc1,roughness:1})
);
floor.rotation.x = -Math.PI/2; floor.position.y = .002; scene.add(floor);

let body = null;
let displayMode = 'clay';
const clay = new THREE.MeshStandardMaterial({color:0x9b958b,roughness:.92,metalness:0});
const silhouette = new THREE.MeshBasicMaterial({color:0x272721});
const wire = new THREE.MeshBasicMaterial({color:0x403d37,wireframe:true});

const loading = document.createElement('div'); loading.className='loading'; loading.textContent='Loading male base'; stage.appendChild(loading);

new GLTFLoader().load('/assets/simple-male.glb', gltf => {
  body = gltf.scene;
  body.traverse(o => {
    if (o.isMesh) {
      o.geometry.computeVertexNormals();
      o.material = clay;
    }
  });
  scene.add(body);
  loading.remove();
  frameBody();
}, undefined, err => {
  loading.textContent='Model failed to load';
  console.error(err);
});

function frameBody(){
  if(!body) return;
  const box = new THREE.Box3().setFromObject(body);
  const center = box.getCenter(new THREE.Vector3());
  controls.target.set(center.x, .92, center.z);
  setView('three');
}

const views = {
  front:[0,.95,3.15],
  three:[2.35,1.1,2.55],
  side:[3.2,.95,0],
  back:[0,.95,-3.15]
};
function setView(name){
  const v=views[name]||views.three;
  camera.position.set(...v);
  controls.target.set(0,.91,0);
  controls.update();
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
}

document.querySelectorAll('[data-view]').forEach(btn=>btn.onclick=()=>setView(btn.dataset.view));
document.querySelector('#reset-camera').onclick=()=>setView('three');

document.querySelectorAll('[data-display]').forEach(btn=>btn.onclick=()=>{
  displayMode=btn.dataset.display;
  document.querySelectorAll('[data-display]').forEach(b=>b.classList.toggle('active',b===btn));
  if(!body) return;
  const mat=displayMode==='clay'?clay:displayMode==='silhouette'?silhouette:wire;
  body.traverse(o=>{if(o.isMesh)o.material=mat});
});

const guideToggle=document.querySelector('#guide-toggle');
let guide=null;
guideToggle.onchange=()=>{
  if(guide){guide.remove();guide=null}
  if(!guideToggle.checked)return;
  guide=document.createElement('div');guide.className='head-guide';
  const top=7,bottom=93,step=(bottom-top)/8;
  for(let i=0;i<=8;i++){
    const line=document.createElement('div'); line.style.top=`${top+i*step}%`; guide.appendChild(line);
    if(i<8){const label=document.createElement('span');label.style.top=`${top+(i+.5)*step}%`;label.textContent=`${i+1}`;guide.appendChild(label)}
  }
  document.querySelector('.stage-card').appendChild(guide);
};

function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;
  renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();

function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
