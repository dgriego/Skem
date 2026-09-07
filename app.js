import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/kunalkushwaha/vsim@main/packages/assets/library/man.glb';

const POSES = {
  neutral: {
    label: 'Neutral',
    note: 'Use the neutral figure to study proportion, landmarks, and how the construction volumes sit on the underlying body.',
    study: [
      'Compare head height to total body height.',
      'Locate rib cage, pelvis, elbows, wrists, knees, and ankles before copying contour.',
      'Rotate the camera and check whether your mental model survives a new view.'
    ],
    rotations: {}
  },
  contrapposto: {
    label: 'Contrapposto',
    note: 'Weight falls onto the left leg. The pelvis tilts and the thorax answers with a quieter counter-tilt.',
    study: [
      'Find the weight-bearing leg before drawing surface contour.',
      'Compare the pelvis axis to the shoulder axis.',
      'Notice where the free leg relaxes and where the supporting side compresses.'
    ],
    rotations: {
      pelvis: [0.00, 0.03, 0.09],
      spine01: [0.00, -0.03, -0.05],
      spine02: [0.00, -0.02, -0.04],
      spine03: [0.00, 0.01, -0.02],
      upperleg01L: [0.02, 0.00, -0.05],
      upperleg01R: [-0.04, 0.02, 0.11],
      lowerleg01R: [0.02, 0.00, -0.03],
      upperarm01L: [0.03, 0.00, 0.05],
      upperarm01R: [-0.03, 0.00, -0.06],
      neck01: [0.00, 0.03, 0.01],
      head: [0.00, 0.02, 0.00]
    }
  },
  reach: {
    label: 'Reach',
    note: 'The reach should read as a whole-body action, not just an arm lift. Track stretch through the side body and the response of the pelvis.',
    study: [
      'Trace the action from the planted foot through the reaching hand.',
      'Compare the stretched side of the torso with the compressed side.',
      'Look at how the scapular/shoulder region changes when the arm lifts.'
    ],
    rotations: {
      pelvis: [0.05, -0.08, 0.03],
      spine01: [-0.08, -0.05, -0.06],
      spine02: [-0.08, -0.03, -0.06],
      spine03: [-0.06, 0.00, -0.04],
      neck01: [0.02, 0.08, 0.02],
      head: [0.00, 0.10, 0.00],
      clavicleR: [0.00, 0.00, -0.22],
      shoulder01R: [0.00, 0.00, -0.18],
      upperarm01R: [-1.25, -0.05, -0.10],
      upperarm02R: [-0.22, 0.00, 0.00],
      lowerarm01R: [-0.15, 0.00, 0.02],
      upperarm01L: [0.12, 0.00, 0.10],
      upperleg01R: [-0.14, 0.04, 0.12],
      lowerleg01R: [0.10, 0.00, -0.02]
    }
  },
  crouch: {
    label: 'Crouch',
    note: 'The crouch compresses the torso over the pelvis and forces clear changes of direction at hip, knee, and ankle.',
    study: [
      'See the rib cage and pelvis as two solids folding toward each other.',
      'Check the femur-to-tibia angle before drawing the knee contour.',
      'Rotate to side view and make sure the knees and hips occupy believable depth.'
    ],
    rotations: {
      pelvis: [0.35, 0.00, 0.00],
      spine01: [-0.18, 0.00, 0.00],
      spine02: [-0.16, 0.00, 0.00],
      spine03: [-0.12, 0.00, 0.00],
      neck01: [0.12, 0.00, 0.00],
      upperleg01L: [-0.95, 0.08, 0.05],
      upperleg01R: [-0.95, -0.08, -0.05],
      lowerleg01L: [1.55, 0.00, 0.00],
      lowerleg01R: [1.55, 0.00, 0.00],
      footL: [-0.50, 0.00, 0.00],
      footR: [-0.50, 0.00, 0.00],
      upperarm01L: [0.25, 0.03, 0.12],
      upperarm01R: [0.25, -0.03, -0.12],
      lowerarm01L: [-0.55, 0.00, 0.00],
      lowerarm01R: [-0.55, 0.00, 0.00]
    }
  }
};

const MODES = [
  { id: 'reference', label: 'Reference', kicker: 'Surface', desc: 'A real skinned human mesh, posed on the same rig used by every teaching layer.' },
  { id: 'construction', label: 'Construction', kicker: 'Build-up', desc: 'Action, rib cage, pelvis, limb axes, joints, and simple solid forms fitted to the rig.' },
  { id: 'masses', label: 'Mass & Wedge', kicker: 'Bridgman-inspired', desc: 'Blockier directional masses that emphasize tilt, turn, compression, and opposition.' },
  { id: 'skeleton', label: 'Skeleton', kicker: 'Rig', desc: 'The actual deform skeleton driving the same surface figure.' },
  { id: 'landmarks', label: 'Landmarks', kicker: 'Anchors', desc: 'Key drawing landmarks derived from the rig: shoulder, pelvis, elbows, knees, wrists, and ankles.' }
];

const state = {
  poseId: 'contrapposto',
  mode: 'reference',
  overlay: true,
  buildStage: 3,
  view: 'three'
};

const els = {
  poseList: document.querySelector('#pose-list'),
  modeList: document.querySelector('#mode-list'),
  note: document.querySelector('#instructor-note'),
  poseTitle: document.querySelector('#pose-title'),
  kicker: document.querySelector('#mode-kicker'),
  hudMode: document.querySelector('#hud-mode'),
  hudDesc: document.querySelector('#hud-desc'),
  study: document.querySelector('#study-points'),
  buildStage: document.querySelector('#build-stage'),
  buildStageLabel: document.querySelector('#build-stage-label'),
  overlay: document.querySelector('#overlay-toggle'),
  stage: document.querySelector('#three-stage'),
  resetCamera: document.querySelector('#reset-camera'),
  viewButtons: [...document.querySelectorAll('[data-view]')]
};

let scene, camera, renderer, controls;
let modelGroup = null;
let skeletonHelper = null;
let loadingEl = null;
let allBones = [];
let boneMap = {};
let restPose = new Map();
let modelHeight = 1.8;
let figureCenter = new THREE.Vector3(0, 0.9, 0);
let shoulderWidth = 0.42;
let hipWidth = 0.31;
const helperGroups = {
  construction: new THREE.Group(),
  masses: new THREE.Group(),
  landmarks: new THREE.Group()
};
const updates = [];

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefe9dd);

  const w = els.stage.clientWidth || 900;
  const h = els.stage.clientHeight || 650;
  camera = new THREE.PerspectiveCamera(32, w / h, 0.01, 50);
  camera.position.set(2.1, 1.25, 2.6);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  els.stage.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.92, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1.35;
  controls.maxDistance = 5.5;
  controls.maxPolarAngle = Math.PI * 0.96;

  scene.add(new THREE.HemisphereLight(0xfffbf2, 0x8e877c, 1.65));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.5, 5.5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff2df, 1.0);
  fill.position.set(-3, 2.5, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xe3e7f0, 0.9);
  rim.position.set(-2, 3, -4);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({ color: 0xe5ded2, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.004;
  scene.add(ground);

  const grid = new THREE.GridHelper(6, 20, 0xb0a594, 0xd7cdbf);
  grid.position.y = 0;
  grid.material.transparent = true;
  grid.material.opacity = 0.45;
  scene.add(grid);

  Object.values(helperGroups).forEach(g => scene.add(g));

  window.addEventListener('resize', onResize);
  els.resetCamera.onclick = () => applyView(state.view);
  els.viewButtons.forEach(btn => btn.onclick = () => {
    state.view = btn.dataset.view;
    highlightViews();
    applyView(state.view);
  });
}

function showLoading(text='Loading MakeHuman figure...') {
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    els.stage.appendChild(loadingEl);
  }
  loadingEl.textContent = text;
}
function hideLoading(){ loadingEl?.remove(); loadingEl = null; }
function showError(message) {
  hideLoading();
  const box = document.createElement('div');
  box.className = 'error-box';
  box.innerHTML = `<strong>Model load issue</strong><br>${message}`;
  els.stage.appendChild(box);
}

function normalized(name='') {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function exactOrFuzzy(...patterns) {
  const wants = patterns.map(normalized);
  for (const wanted of wants) {
    const exact = allBones.find(b => normalized(b.name) === wanted);
    if (exact) return exact;
  }
  for (const wanted of wants) {
    const match = allBones.find(b => normalized(b.name).includes(wanted));
    if (match) return match;
  }
  return null;
}

function buildBoneMap() {
  boneMap = {
    root: exactOrFuzzy('root'),
    pelvis: exactOrFuzzy('pelvis', 'hips'),
    spine01: exactOrFuzzy('spine01', 'spine1', 'spine'),
    spine02: exactOrFuzzy('spine02', 'spine2', 'chest'),
    spine03: exactOrFuzzy('spine03', 'spine3', 'upperchest'),
    neck01: exactOrFuzzy('neck01', 'neck1', 'neck'),
    head: exactOrFuzzy('head'),

    clavicleL: exactOrFuzzy('clavicle.L', 'clavicleL', 'leftclavicle'),
    shoulder01L: exactOrFuzzy('shoulder01.L', 'shoulderL', 'leftshoulder'),
    upperarm01L: exactOrFuzzy('upperarm01.L', 'upperarmL', 'leftupperarm'),
    upperarm02L: exactOrFuzzy('upperarm02.L'),
    lowerarm01L: exactOrFuzzy('lowerarm01.L', 'lowerarmL', 'leftforearm'),
    lowerarm02L: exactOrFuzzy('lowerarm02.L'),
    wristL: exactOrFuzzy('wrist.L', 'wristL', 'lefthand', 'handL'),

    clavicleR: exactOrFuzzy('clavicle.R', 'clavicleR', 'rightclavicle'),
    shoulder01R: exactOrFuzzy('shoulder01.R', 'shoulderR', 'rightshoulder'),
    upperarm01R: exactOrFuzzy('upperarm01.R', 'upperarmR', 'rightupperarm'),
    upperarm02R: exactOrFuzzy('upperarm02.R'),
    lowerarm01R: exactOrFuzzy('lowerarm01.R', 'lowerarmR', 'rightforearm'),
    lowerarm02R: exactOrFuzzy('lowerarm02.R'),
    wristR: exactOrFuzzy('wrist.R', 'wristR', 'righthand', 'handR'),

    upperleg01L: exactOrFuzzy('upperleg01.L', 'upperlegL', 'leftupleg', 'leftthigh'),
    upperleg02L: exactOrFuzzy('upperleg02.L'),
    lowerleg01L: exactOrFuzzy('lowerleg01.L', 'lowerlegL', 'leftleg', 'leftshin'),
    lowerleg02L: exactOrFuzzy('lowerleg02.L'),
    footL: exactOrFuzzy('foot.L', 'footL', 'leftfoot'),

    upperleg01R: exactOrFuzzy('upperleg01.R', 'upperlegR', 'rightupleg', 'rightthigh'),
    upperleg02R: exactOrFuzzy('upperleg02.R'),
    lowerleg01R: exactOrFuzzy('lowerleg01.R', 'lowerlegR', 'rightleg', 'rightshin'),
    lowerleg02R: exactOrFuzzy('lowerleg02.R'),
    footR: exactOrFuzzy('foot.R', 'footR', 'rightfoot')
  };
}

function snapshotRest() {
  allBones.forEach(b => restPose.set(b.uuid, {
    p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone()
  }));
}
function restoreRest() {
  allBones.forEach(b => {
    const r = restPose.get(b.uuid);
    if (!r) return;
    b.position.copy(r.p); b.quaternion.copy(r.q); b.scale.copy(r.s);
  });
}

function styleModel() {
  const clay = new THREE.MeshPhysicalMaterial({
    color: 0xb4aa9a,
    roughness: 0.74,
    metalness: 0,
    clearcoat: 0.03,
    sheen: 0.08,
    sheenColor: new THREE.Color(0xffffff),
    transparent: true,
    opacity: 1
  });
  const eye = new THREE.MeshStandardMaterial({ color: 0xd8d3ca, roughness: 0.35, transparent: true, opacity: 1 });
  modelGroup.traverse(obj => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.frustumCulled = false;
    const lname = (obj.name || '').toLowerCase();
    obj.material = (lname.includes('eye') ? eye : clay).clone();
  });
}

function fitModelToStudyScale() {
  modelGroup.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(modelGroup);
  const initialHeight = box.max.y - box.min.y;
  const targetHeight = 1.82;
  const scale = initialHeight > 0 ? targetHeight / initialHeight : 1;
  modelGroup.scale.multiplyScalar(scale);
  modelGroup.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(modelGroup);
  modelGroup.position.y -= box.min.y;
  modelGroup.position.x -= (box.min.x + box.max.x) / 2;
  modelGroup.position.z -= (box.min.z + box.max.z) / 2;
  modelGroup.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(modelGroup);
  modelHeight = box.max.y - box.min.y;
  figureCenter.copy(box.getCenter(new THREE.Vector3()));
}

function bonePos(key) {
  const b = boneMap[key];
  if (!b) return null;
  const p = new THREE.Vector3();
  b.getWorldPosition(p);
  return p;
}

function measureRig() {
  const lShoulder = bonePos('upperarm01L');
  const rShoulder = bonePos('upperarm01R');
  const lHip = bonePos('upperleg01L');
  const rHip = bonePos('upperleg01R');
  if (lShoulder && rShoulder) shoulderWidth = lShoulder.distanceTo(rShoulder);
  if (lHip && rHip) hipWidth = lHip.distanceTo(rHip);
}

async function loadModel() {
  showLoading();
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(MODEL_URL);
    modelGroup = gltf.scene;
    scene.add(modelGroup);
    modelGroup.updateMatrixWorld(true);

    const skinnedMeshes = [];
    modelGroup.traverse(obj => {
      if (obj.isSkinnedMesh) skinnedMeshes.push(obj);
    });
    if (!skinnedMeshes.length) throw new Error('The human asset loaded, but no skinned mesh was found.');

    const boneSet = new Map();
    skinnedMeshes.forEach(mesh => mesh.skeleton.bones.forEach(b => boneSet.set(b.uuid, b)));
    allBones = [...boneSet.values()];
    if (!allBones.length) throw new Error('The human asset did not expose a usable deform skeleton.');

    buildBoneMap();
    snapshotRest();
    styleModel();
    fitModelToStudyScale();
    measureRig();

    skeletonHelper = new THREE.SkeletonHelper(modelGroup);
    skeletonHelper.material = new THREE.LineBasicMaterial({ color: 0xdd603f, transparent: true, opacity: 0.95 });
    scene.add(skeletonHelper);

    buildStudyHelpers();
    applyPose(state.poseId);
    applyView(state.view);
    updateModeVisibility();
    hideLoading();
  } catch (err) {
    console.error(err);
    showError('The MakeHuman asset could not be loaded in this browser session. The app is wired for the asset-first pipeline, but the final model should be vendored into the Skem repo rather than fetched from a CDN.');
  }
}

function line(color=0x6d675c, opacity=1) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  );
}
function setLine(lineObj, a, b) {
  if (!a || !b) { lineObj.visible = false; return; }
  lineObj.visible = true;
  lineObj.geometry.setFromPoints([a, b]);
}
function jointSphere(radius=0.022, color=0x2f2e29) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), new THREE.MeshBasicMaterial({ color }));
}
function cylinder(color=0x756d60, opacity=0.18, wire=true) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(1,1,1,16,1,false),
    new THREE.MeshBasicMaterial({ color, wireframe: wire, transparent: true, opacity })
  );
}
function boxProxy(color=0x3f3d37, opacity=0.16) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity })
  );
}
function ellipsoid(color=0x655f54, opacity=0.18) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 14),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity })
  );
}
function between(mesh, a, b, radius=0.04) {
  if (!a || !b) { mesh.visible = false; return; }
  mesh.visible = true;
  const dir = b.clone().sub(a);
  const len = dir.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(radius, len, radius);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
}

function buildStudyHelpers() {
  updates.length = 0;
  Object.values(helperGroups).forEach(g => g.clear());

  const gesture = line(0xdd603f, 1);
  const shoulderAxis = line(0xdd603f, 1);
  const pelvisAxis = line(0xdd603f, 1);
  helperGroups.construction.add(gesture, shoulderAxis, pelvisAxis);
  updates.push(() => {
    const pts = ['head','spine03','pelvis','upperleg01L','lowerleg01L','footL'].map(bonePos).filter(Boolean);
    if (pts.length > 1) gesture.geometry.setFromPoints(pts);
    gesture.visible = state.buildStage >= 1;
    setLine(shoulderAxis, bonePos('upperarm01L'), bonePos('upperarm01R'));
    setLine(pelvisAxis, bonePos('upperleg01L'), bonePos('upperleg01R'));
    shoulderAxis.visible = pelvisAxis.visible = state.buildStage >= 1;
  });

  const ribs = ellipsoid(0x5f594f, 0.24);
  const pelvis = boxProxy(0x5f594f, 0.26);
  helperGroups.construction.add(ribs, pelvis);
  updates.push(() => {
    const chest = bonePos('spine03') || bonePos('spine02');
    const lowerSpine = bonePos('spine01');
    const hips = bonePos('pelvis');
    if (chest && lowerSpine) {
      ribs.position.copy(chest).lerp(lowerSpine, 0.28);
      ribs.scale.set(Math.max(shoulderWidth*0.40,0.13), Math.max(modelHeight*0.13,0.18), Math.max(shoulderWidth*0.25,0.09));
      ribs.visible = state.buildStage >= 2;
    } else ribs.visible = false;
    if (hips) {
      pelvis.position.copy(hips);
      pelvis.scale.set(Math.max(hipWidth*1.18,0.22), modelHeight*0.07, Math.max(hipWidth*0.78,0.15));
      pelvis.visible = state.buildStage >= 2;
    } else pelvis.visible = false;
  });

  const segments = [
    ['upperarm01L','lowerarm01L',0.040], ['lowerarm01L','wristL',0.034],
    ['upperarm01R','lowerarm01R',0.040], ['lowerarm01R','wristR',0.034],
    ['upperleg01L','lowerleg01L',0.055], ['lowerleg01L','footL',0.043],
    ['upperleg01R','lowerleg01R',0.055], ['lowerleg01R','footR',0.043]
  ];
  segments.forEach(([aKey,bKey,r]) => {
    const axis = line(0x746c60, 0.95);
    const volume = cylinder(0x6e6659, 0.20, true);
    const aJoint = jointSphere(r*0.56, 0x3b3933);
    helperGroups.construction.add(axis, volume, aJoint);
    updates.push(() => {
      const a = bonePos(aKey), b = bonePos(bKey);
      setLine(axis,a,b);
      between(volume,a,b,r);
      if (a) { aJoint.position.copy(a); aJoint.visible = true; } else aJoint.visible=false;
      const visible = state.buildStage >= 3;
      axis.visible = axis.visible && visible;
      volume.visible = volume.visible && visible;
      aJoint.visible = aJoint.visible && visible;
    });
  });

  const centerLine = line(0xdd603f, 0.9);
  const chestCross = line(0x81786a, 0.9);
  const hipCross = line(0x81786a, 0.9);
  helperGroups.construction.add(centerLine, chestCross, hipCross);
  updates.push(() => {
    setLine(centerLine, bonePos('neck01'), bonePos('pelvis'));
    setLine(chestCross, bonePos('upperarm01L'), bonePos('upperarm01R'));
    setLine(hipCross, bonePos('upperleg01L'), bonePos('upperleg01R'));
    centerLine.visible = centerLine.visible && state.buildStage >= 4;
    chestCross.visible = chestCross.visible && state.buildStage >= 4;
    hipCross.visible = hipCross.visible && state.buildStage >= 4;
  });

  const ribBlock = boxProxy(0x292822, 0.26);
  const pelvisBlock = boxProxy(0x292822, 0.26);
  helperGroups.masses.add(ribBlock, pelvisBlock);
  updates.push(() => {
    const chest = bonePos('spine03') || bonePos('spine02');
    const hips = bonePos('pelvis');
    if (chest) {
      ribBlock.position.copy(chest);
      ribBlock.scale.set(Math.max(shoulderWidth*0.72,0.25), modelHeight*0.23, Math.max(shoulderWidth*0.48,0.16));
      ribBlock.rotation.set(-0.04,0,0.04);
      ribBlock.visible = state.buildStage >= 2;
    } else ribBlock.visible=false;
    if (hips) {
      pelvisBlock.position.copy(hips);
      pelvisBlock.scale.set(Math.max(hipWidth*1.20,0.23), modelHeight*0.10, Math.max(hipWidth*0.78,0.15));
      pelvisBlock.rotation.set(0.03,0,-0.05);
      pelvisBlock.visible = state.buildStage >= 2;
    } else pelvisBlock.visible=false;
  });

  segments.forEach(([aKey,bKey,r]) => {
    const wedge = boxProxy(0x393832, 0.21);
    helperGroups.masses.add(wedge);
    updates.push(() => {
      const a = bonePos(aKey), b = bonePos(bKey);
      between(wedge,a,b,r*1.35);
      wedge.visible = wedge.visible && state.buildStage >= 3;
    });
  });

  const massShoulders = line(0xdd603f,1);
  const massHips = line(0xdd603f,1);
  helperGroups.masses.add(massShoulders,massHips);
  updates.push(() => {
    setLine(massShoulders,bonePos('upperarm01L'),bonePos('upperarm01R'));
    setLine(massHips,bonePos('upperleg01L'),bonePos('upperleg01R'));
    massShoulders.visible = massShoulders.visible && state.buildStage >= 4;
    massHips.visible = massHips.visible && state.buildStage >= 4;
  });

  const landmarkKeys = [
    'upperarm01L','upperarm01R','lowerarm01L','lowerarm01R','wristL','wristR',
    'upperleg01L','upperleg01R','lowerleg01L','lowerleg01R','footL','footR',
    'pelvis','neck01','head'
  ];
  landmarkKeys.forEach(key => {
    const dot = jointSphere(key==='pelvis'?0.03:0.022, 0xdd603f);
    helperGroups.landmarks.add(dot);
    updates.push(() => {
      const p = bonePos(key);
      if (p) dot.position.copy(p);
      dot.visible = !!p && state.buildStage >= 5;
    });
  });
}

function applyPose(poseId) {
  state.poseId = poseId;
  if (!modelGroup || !allBones.length) {
    updateUI();
    return;
  }
  restoreRest();
  const pose = POSES[poseId];
  for (const [key, rot] of Object.entries(pose.rotations)) {
    const bone = boneMap[key];
    if (!bone) continue;
    bone.rotation.order = 'XYZ';
    bone.rotation.x += rot[0] || 0;
    bone.rotation.y += rot[1] || 0;
    bone.rotation.z += rot[2] || 0;
  }
  modelGroup.updateMatrixWorld(true);
  measureRig();
  updateUI();
}

function setSurfaceOpacity(opacity, visible=true) {
  modelGroup?.traverse(obj => {
    if (!obj.isMesh) return;
    obj.visible = visible;
    obj.material.transparent = opacity < 1;
    obj.material.opacity = opacity;
    obj.material.depthWrite = opacity >= 0.98;
  });
}

function updateModeVisibility() {
  if (!modelGroup) return;
  const reference = state.mode === 'reference';
  if (reference) setSurfaceOpacity(1, true);
  else if (state.overlay) setSurfaceOpacity(0.13, true);
  else setSurfaceOpacity(0, false);

  helperGroups.construction.visible = state.mode === 'construction';
  helperGroups.masses.visible = state.mode === 'masses';
  helperGroups.landmarks.visible = state.mode === 'landmarks';
  if (skeletonHelper) skeletonHelper.visible = state.mode === 'skeleton';

  const mode = MODES.find(m => m.id === state.mode);
  els.kicker.textContent = mode.kicker;
  els.hudMode.textContent = mode.label;
  els.hudDesc.textContent = mode.desc;
}

function applyView(view) {
  const center = figureCenter.clone();
  const d = Math.max(modelHeight * 1.55, 2.7);
  const views = {
    front: [0, center.y + 0.05, d],
    three: [d*0.72, center.y + 0.08, d*0.72],
    side: [d, center.y + 0.04, 0],
    back: [0, center.y + 0.05, -d]
  };
  camera.position.set(...(views[view] || views.three));
  controls.target.copy(center);
  controls.update();
}

function updateUI() {
  const pose = POSES[state.poseId];
  els.note.textContent = pose.note;
  els.poseTitle.textContent = pose.label;
  els.study.innerHTML = pose.study.map(s => `<li>${s}</li>`).join('');
  els.poseList.innerHTML = Object.entries(POSES).map(([id,p]) => `
    <button class="pose-button ${id===state.poseId?'active':''}" data-pose="${id}">
      <span>${p.label}</span><small>${id===state.poseId?'Selected':'Study'}</small>
    </button>`).join('');
  els.modeList.innerHTML = MODES.map((m,i) => `
    <button class="mode-button ${m.id===state.mode?'active':''}" data-mode="${m.id}">
      <span class="mode-index">0${i+1}</span><div><b>${m.label}</b><small>${m.kicker}</small></div>
    </button>`).join('');
  els.buildStageLabel.textContent = `Stage ${state.buildStage} of 5`;
  document.querySelectorAll('[data-pose]').forEach(el => el.onclick = () => applyPose(el.dataset.pose));
  document.querySelectorAll('[data-mode]').forEach(el => el.onclick = () => {
    state.mode = el.dataset.mode;
    updateUI();
    updateModeVisibility();
  });
  highlightViews();
}

function highlightViews() {
  els.viewButtons.forEach(b => b.classList.toggle('active', b.dataset.view===state.view));
}
function onResize() {
  if (!renderer) return;
  const w = els.stage.clientWidth || 900;
  const h = els.stage.clientHeight || 650;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
}
function animate() {
  requestAnimationFrame(animate);
  controls?.update();
  if (modelGroup) {
    modelGroup.updateMatrixWorld(true);
    updates.forEach(fn => fn());
  }
  renderer?.render(scene,camera);
}

els.overlay.addEventListener('change', e => {
  state.overlay=e.target.checked;
  updateModeVisibility();
});
els.buildStage.addEventListener('input', e => {
  state.buildStage = Number(e.target.value);
  els.buildStageLabel.textContent = `Stage ${state.buildStage} of 5`;
});

updateUI();
initScene();
loadModel();
animate();
