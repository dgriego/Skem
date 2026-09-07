import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// CC0 male base mesh by orange-juice-games, mirrored on GitHub by BoQsc.
// Using a public CDN here avoids preview-auth issues with binary subrequests.
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/BoQsc/Godot-3D-Male-Base-Mesh@main/Original/male_base_mesh.glb';

const stage = document.querySelector('#three-stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeee7db);

const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 30);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1.2;
controls.maxDistance = 6;
controls.target.set(0, 0.95, 0);

scene.add(new THREE.HemisphereLight(0xfffbf3, 0x81796d, 2.15));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2.5, 4, 3);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe9e3d8, 1.0);
fill.position.set(-3, 2, -2);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 5),
  new THREE.MeshStandardMaterial({ color: 0xd8cfc1, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.002;
scene.add(floor);

let body = null;
let displayMode = 'clay';
const clay = new THREE.MeshStandardMaterial({
  color: 0x9b958b,
  roughness: 0.95,
  metalness: 0,
  side: THREE.DoubleSide
});
const silhouette = new THREE.MeshBasicMaterial({ color: 0x272721, side: THREE.DoubleSide });
const wire = new THREE.MeshBasicMaterial({ color: 0x403d37, wireframe: true, side: THREE.DoubleSide });

const loading = document.createElement('div');
loading.className = 'loading';
loading.textContent = 'Loading male base';
stage.appendChild(loading);

function normalizeBody(root) {
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());

  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Invalid model bounds');

  const scale = 1.78 / size.y;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
}

function applyMaterial() {
  if (!body) return;
  const material = displayMode === 'clay' ? clay : displayMode === 'silhouette' ? silhouette : wire;
  body.traverse(obj => {
    if (!obj.isMesh) return;
    obj.material = material;
    obj.frustumCulled = false;
  });
}

new GLTFLoader().load(
  MODEL_URL,
  gltf => {
    body = gltf.scene;
    normalizeBody(body);

    body.traverse(obj => {
      if (obj.isMesh && obj.geometry?.attributes?.position) {
        if (!obj.geometry.attributes.normal) obj.geometry.computeVertexNormals();
      }
    });

    applyMaterial();
    scene.add(body);
    loading.remove();
    setView('three');
  },
  undefined,
  err => {
    console.error('Male base model failed to load:', err);
    loading.textContent = 'Model failed to load · refresh once';
    loading.dataset.error = 'true';
  }
);

const views = {
  front: [0, 0.98, 3.25],
  three: [2.4, 1.12, 2.65],
  side: [3.25, 0.98, 0],
  back: [0, 0.98, -3.25]
};

function setView(name) {
  const v = views[name] || views.three;
  camera.position.set(...v);
  controls.target.set(0, 0.92, 0);
  controls.update();
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === name);
  });
}

document.querySelectorAll('[data-view]').forEach(btn => {
  btn.onclick = () => setView(btn.dataset.view);
});
document.querySelector('#reset-camera').onclick = () => setView('three');

document.querySelectorAll('[data-display]').forEach(btn => {
  btn.onclick = () => {
    displayMode = btn.dataset.display;
    document.querySelectorAll('[data-display]').forEach(b => b.classList.toggle('active', b === btn));
    applyMaterial();
  };
});

const guideToggle = document.querySelector('#guide-toggle');
let guide = null;
guideToggle.onchange = () => {
  if (guide) {
    guide.remove();
    guide = null;
  }
  if (!guideToggle.checked) return;

  guide = document.createElement('div');
  guide.className = 'head-guide';
  const top = 7;
  const bottom = 93;
  const step = (bottom - top) / 8;
  for (let i = 0; i <= 8; i++) {
    const line = document.createElement('div');
    line.style.top = `${top + i * step}%`;
    guide.appendChild(line);
    if (i < 8) {
      const label = document.createElement('span');
      label.style.top = `${top + (i + 0.5) * step}%`;
      label.textContent = `${i + 1}`;
      guide.appendChild(label);
    }
  }
  document.querySelector('.stage-card').appendChild(guide);
};

function resize() {
  const w = Math.max(stage.clientWidth, 1);
  const h = Math.max(stage.clientHeight, 1);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
