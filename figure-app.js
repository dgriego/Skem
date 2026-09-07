import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.querySelector('#three-stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3f0ea);

const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
camera.position.set(6.6, 2.7, 10.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.15, 0);
controls.minDistance = 4;
controls.maxDistance = 18;

scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c0b4, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(4, 7, 5);
scene.add(key);

const grid = new THREE.GridHelper(10, 20, 0xbeb8ae, 0xddd8d0);
grid.position.y = -3.35;
scene.add(grid);

const faceMaterial = new THREE.MeshStandardMaterial({
  color: 0xf7f4ee,
  roughness: 1,
  metalness: 0,
  flatShading: true,
  side: THREE.DoubleSide
});
const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: 0x242424, side: THREE.DoubleSide });
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x242424 });
const guideMaterial = new THREE.LineBasicMaterial({ color: 0xc85b3d });

const root = new THREE.Group();
scene.add(root);
const guideRoot = new THREE.Group();
scene.add(guideRoot);

function frustumGeometry({ topW, bottomW, topD, bottomD, height, topShiftX = 0, topShiftZ = 0, frontSlope = 0 }) {
  const h = height / 2;
  const tw = topW / 2, bw = bottomW / 2;
  const td = topD / 2, bd = bottomD / 2;
  const v = [
    [-bw,-h,-bd],[bw,-h,-bd],[bw,-h,bd],[-bw,-h,bd],
    [-tw+topShiftX,h,-td+topShiftZ],[tw+topShiftX,h,-td+topShiftZ],
    [tw+topShiftX,h,td+topShiftZ+frontSlope],[-tw+topShiftX,h,td+topShiftZ+frontSlope]
  ];
  const faces = [0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
  const pos = [];
  faces.forEach(i => pos.push(...v[i]));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function addPart(parent, geometry, position = [0,0,0], rotation = [0,0,0]) {
  const mesh = new THREE.Mesh(geometry, faceMaterial);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.userData.part = true;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 18), edgeMaterial);
  edges.userData.edges = true;
  mesh.add(edges);
  parent.add(mesh);
  return mesh;
}

function joint(radius, position) {
  return addPart(root, new THREE.SphereGeometry(radius, 12, 8), position);
}

function limb(start, end, topRadius, bottomRadius, depthScale = 0.86) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const d = b.clone().sub(a);
  const length = d.length();
  const g = new THREE.CylinderGeometry(topRadius, bottomRadius, length, 6, 1, false);
  const p = g.attributes.position;
  for (let i=0;i<p.count;i++) p.setZ(i, p.getZ(i) * depthScale);
  p.needsUpdate = true;
  g.computeVertexNormals();
  const part = addPart(root, g);
  part.position.copy(a.clone().add(b).multiplyScalar(0.5));
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize());
  return part;
}

function createHand(side, position, rotationZ = 0) {
  const g = new THREE.Group();
  const palm = frustumGeometry({ topW:.22,bottomW:.34,topD:.14,bottomD:.18,height:.42,frontSlope:.02 });
  addPart(g, palm, [0,-.03,0]);

  const lengths = [.24,.29,.26,.20];
  const xs = [-.10,-.03,.04,.11];
  const rots = [-.05,-.02,.02,.06];
  lengths.forEach((len,i) => {
    const fg = frustumGeometry({ topW:.055,bottomW:.026,topD:.05,bottomD:.035,height:len });
    addPart(g, fg, [xs[i]*side, -.34-len*.34, 0], [0,0,rots[i]*side]);
  });

  const thumb = frustumGeometry({ topW:.07,bottomW:.045,topD:.06,bottomD:.045,height:.18 });
  addPart(g, thumb, [.17*side,-.08,0], [.15,.05*side,-.82*side]);
  const wrist = frustumGeometry({ topW:.09,bottomW:.08,topD:.09,bottomD:.08,height:.12 });
  addPart(g, wrist, [0,.24,0]);
  g.scale.setScalar(.62);
  g.position.set(...position);
  g.rotation.z = rotationZ;
  root.add(g);
}

function createFoot(side, position, yaw = 0) {
  const g = new THREE.Group();
  const rear = frustumGeometry({ topW:.34,bottomW:.40,topD:.34,bottomD:.30,height:.78,topShiftX:-.01,topShiftZ:-.02,frontSlope:.03 });
  addPart(g, rear, [-.02,-.03,-.06], [Math.PI/2,0,.03]);
  const toe = frustumGeometry({ topW:.28,bottomW:.38,topD:.24,bottomD:.30,height:.84,topShiftZ:.05,frontSlope:.05 });
  addPart(g, toe, [0,-.08,.60], [Math.PI/2,0,0]);
  const ankle = frustumGeometry({ topW:.18,bottomW:.24,topD:.17,bottomD:.20,height:.18 });
  addPart(g, ankle, [0,.22,-.14]);
  g.scale.setScalar(.74);
  g.position.set(...position);
  g.rotation.y = yaw + side * .025;
  root.add(g);
}

const POSES = {
  standing: {
    torso: { pos:[0,2.15,0], rot:[0,0,-.03] },
    pelvis:{ pos:[.05,.73,.03], rot:[0,0,.035] },
    head:{ pos:[0,3.52,0], rot:[-.03,.08,-.02] },
    arms:[
      {side:-1, shoulder:[-.83,2.55,0], elbow:[-1.16,1.62,.03], wrist:[-1.08,.78,.08]},
      {side: 1, shoulder:[ .83,2.55,0], elbow:[ 1.20,1.68,.02], wrist:[ 1.12,.88,.10]}
    ],
    legs:[
      {side:-1, hip:[-.36,.42,.01], knee:[-.42,-1.25,.05], ankle:[-.38,-2.76,.05]},
      {side: 1, hip:[ .42,.44,.02], knee:[ .47,-1.21,.08], ankle:[ .43,-2.72,.06]}
    ]
  },
  reach: {
    torso: { pos:[0,2.13,0], rot:[.03,-.04,-.10] },
    pelvis:{ pos:[.10,.72,.03], rot:[0,.02,.08] },
    head:{ pos:[-.05,3.52,.02], rot:[-.08,.14,-.08] },
    arms:[
      {side:-1, shoulder:[-.82,2.55,0], elbow:[-1.20,1.62,.06], wrist:[-1.08,.78,.12]},
      {side: 1, shoulder:[ .80,2.63,0], elbow:[ 1.38,3.15,.02], wrist:[ 1.62,3.86,.08]}
    ],
    legs:[
      {side:-1, hip:[-.34,.40,0], knee:[-.58,-1.18,.06], ankle:[-.70,-2.72,.08]},
      {side: 1, hip:[ .45,.45,.03], knee:[ .56,-1.20,.10], ankle:[ .47,-2.72,.04]}
    ]
  },
  step: {
    torso: { pos:[-.02,2.12,0], rot:[0,.04,.06] },
    pelvis:{ pos:[.08,.72,.04], rot:[0,-.04,-.08] },
    head:{ pos:[-.03,3.50,0], rot:[-.02,-.10,.03] },
    arms:[
      {side:-1, shoulder:[-.84,2.54,0], elbow:[-1.24,1.88,.08], wrist:[-1.44,1.22,.14]},
      {side: 1, shoulder:[ .82,2.56,0], elbow:[ 1.17,1.56,.02], wrist:[ 1.07,.70,.08]}
    ],
    legs:[
      {side:-1, hip:[-.37,.41,.02], knee:[-.58,-1.04,.16], ankle:[-.90,-2.38,.38]},
      {side: 1, hip:[ .43,.44,.02], knee:[ .52,-1.24,.06], ankle:[ .44,-2.74,.02]}
    ]
  }
};

let poseName = 'standing';
let silhouette = false;
let guides = false;

function clearGroup(group) {
  while (group.children.length) group.remove(group.children[0]);
}

function buildFigure() {
  clearGroup(root);
  clearGroup(guideRoot);
  const pose = POSES[poseName];

  const head = frustumGeometry({ topW:.52,bottomW:.46,topD:.44,bottomD:.48,height:.64,topShiftX:.025,topShiftZ:-.015 });
  addPart(root, head, pose.head.pos, pose.head.rot);

  addPart(root, new THREE.CylinderGeometry(.12,.14,.33,8,1,false), [0,3.03,0]);

  const torso = frustumGeometry({ topW:1.48,bottomW:.96,topD:.72,bottomD:.58,height:1.55,topShiftX:-.03,topShiftZ:-.03,frontSlope:.08 });
  addPart(root, torso, pose.torso.pos, pose.torso.rot);

  const pelvis = frustumGeometry({ topW:1.02,bottomW:.84,topD:.62,bottomD:.52,height:.62,topShiftX:.04,topShiftZ:.03,frontSlope:.055 });
  addPart(root, pelvis, pose.pelvis.pos, pose.pelvis.rot);

  pose.arms.forEach(({side,shoulder,elbow,wrist}) => {
    joint(.20, shoulder);
    limb(shoulder, elbow, .18, .135, .84);
    joint(.125, elbow);
    limb(elbow, wrist, .135, .095, .82);
    joint(.09, wrist);
    const handPos = [wrist[0], wrist[1]-.38, wrist[2]];
    const handAngle = poseName === 'reach' && side === 1 ? -.15 : side * -.05;
    createHand(side, handPos, handAngle);
  });

  pose.legs.forEach(({side,hip,knee,ankle}) => {
    joint(.19, hip);
    limb(hip, knee, .25, .19, .88);
    joint(.145, knee);
    limb(knee, ankle, .185, .115, .84);
    joint(.095, ankle);
    createFoot(side, [ankle[0], ankle[1]-.18, ankle[2]+.22], poseName === 'step' && side === -1 ? -.18 : 0);
  });

  const axis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-3.15,0),new THREE.Vector3(0,3.9,0)]),
    guideMaterial
  );
  guideRoot.add(axis);
  [-2.75,-1.23,.73,2.15,3.52].forEach(y => {
    guideRoot.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.55,y,0),new THREE.Vector3(1.55,y,0)]),
      guideMaterial
    ));
  });

  applyDisplay();
}

function applyDisplay() {
  root.traverse(obj => {
    if (obj.isMesh) obj.material = silhouette ? silhouetteMaterial : faceMaterial;
    if (obj.userData.edges) obj.visible = !silhouette;
  });
  guideRoot.visible = guides && !silhouette;
}

function setPose(name) {
  poseName = name;
  document.querySelectorAll('[data-pose]').forEach(b => b.classList.toggle('active', b.dataset.pose === name));
  buildFigure();
}

document.querySelectorAll('[data-pose]').forEach(btn => btn.addEventListener('click', () => setPose(btn.dataset.pose)));
document.querySelector('#silhouette-toggle').addEventListener('change', e => { silhouette = e.target.checked; applyDisplay(); });
document.querySelector('#guide-toggle').addEventListener('change', e => { guides = e.target.checked; applyDisplay(); });
document.querySelector('#reset-view').addEventListener('click', () => {
  camera.position.set(6.6,2.7,10.5);
  controls.target.set(0,.15,0);
  controls.update();
});

function resize() {
  const w = Math.max(1, stage.clientWidth);
  const h = Math.max(1, stage.clientHeight);
  renderer.setSize(w,h,false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
buildFigure();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene,camera);
}
animate();
