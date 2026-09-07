import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.querySelector('#three-stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3f0ea);

const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 50);
camera.position.set(4.3, 3.0, 5.1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.minDistance = 1.3;
controls.maxDistance = 12;

scene.add(new THREE.HemisphereLight(0xffffff, 0xc7c1b7, 2.3));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(4, 6, 4);
scene.add(key);

const grid = new THREE.GridHelper(8, 16, 0xbeb8ae, 0xddd8d0);
grid.position.y = -1.65;
scene.add(grid);

const faceMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5f2ec,
  roughness: 1,
  metalness: 0,
  side: THREE.DoubleSide,
  flatShading: true
});
const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: 0x252525, side: THREE.DoubleSide });
const wireMaterial = new THREE.MeshBasicMaterial({ color: 0x393939, wireframe: true, side: THREE.DoubleSide });
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x2d2d2d });
const guideMaterial = new THREE.LineBasicMaterial({ color: 0xc4573c });
const contourMaterial = new THREE.LineBasicMaterial({ color: 0x69645d });

const DEFINITIONS = {
  head: {
    label: 'Head Block',
    desc: 'box head / orientation mass',
    rule: 'A simple block with a readable front plane',
    defaults: { width: 1.0, height: 1.2, depth: 0.86, top: 0.92, middle: 1, bottom: 0.86, taper: 0.08, bulge: 0, squash: 0, bow: 0, shear: 0.08 }
  },
  torso: {
    label: 'Torso Prism',
    desc: 'trapezoid chest / upper torso',
    rule: 'Broad at the shoulders and narrower toward the waist',
    defaults: { width: 1.75, height: 2.15, depth: 1.05, top: 1.12, middle: 1, bottom: 0.72, taper: 0.18, bulge: 0, squash: 0, bow: 0, shear: 0.02 }
  },
  pelvis: {
    label: 'Pelvis Block',
    desc: 'short box / wedge mass',
    rule: 'Compact, boxy, and clearly separated from the torso',
    defaults: { width: 1.55, height: 0.95, depth: 1.0, top: 1.02, middle: 0.95, bottom: 0.8, taper: 0.12, bulge: 0, squash: 0, bow: 0, shear: -0.04 }
  },
  limb: {
    label: 'Tapered Limb',
    desc: 'faceted arm / leg segment',
    rule: 'Long low-sided prism that visibly narrows toward the joint',
    defaults: { width: 0.58, height: 2.45, depth: 0.58, top: 1.0, middle: 0.86, bottom: 0.62, taper: 0.25, bulge: 0, squash: 0, bow: 0.04, shear: 0 }
  },
  joint: {
    label: 'Joint Ball',
    desc: 'shoulder / elbow / knee connector',
    rule: 'Small round connector between larger construction forms',
    defaults: { width: 0.72, height: 0.72, depth: 0.72, top: 1, middle: 1, bottom: 1, taper: 0, bulge: 0, squash: 0, bow: 0, shear: 0 }
  },
  hand: {
    label: 'Hand Block',
    desc: 'small wedge / palm mass',
    rule: 'A directional block that can later accept finger wedges',
    defaults: { width: 0.65, height: 0.9, depth: 0.42, top: 0.82, middle: 0.92, bottom: 0.62, taper: 0.18, bulge: 0, squash: 0, bow: 0, shear: 0.08 }
  },
  foot: {
    label: 'Foot Wedge',
    desc: 'low directional wedge',
    rule: 'Low heel-to-toe wedge with a clear top plane',
    defaults: { width: 0.72, height: 0.48, depth: 1.7, top: 0.72, middle: 0.9, bottom: 1.08, taper: 0.2, bulge: 0, squash: 0.05, bow: 0, shear: 0.08 }
  },
  neck: {
    label: 'Neck Peg',
    desc: 'short connector',
    rule: 'A small simple peg between head and torso',
    defaults: { width: 0.42, height: 0.7, depth: 0.42, top: 0.9, middle: 1, bottom: 1, taper: 0.08, bulge: 0, squash: 0, bow: 0, shear: 0 }
  }
};

let formType = 'torso';
let params = { ...DEFINITIONS[formType].defaults };
let root = new THREE.Group();
scene.add(root);
let mesh = null;
let edgeLines = null;
let axisGroup = null;
let contourGroup = null;

function frustumGeometry({ topW, bottomW, topD, bottomD, height, topShiftX = 0, topShiftZ = 0, frontSlope = 0 }) {
  const h = height / 2;
  const tw = topW / 2, bw = bottomW / 2;
  const td = topD / 2, bd = bottomD / 2;
  const zf = frontSlope;
  const v = [
    [-bw, -h, -bd], [bw, -h, -bd], [bw, -h, bd], [-bw, -h, bd],
    [-tw + topShiftX, h, -td + topShiftZ], [tw + topShiftX, h, -td + topShiftZ],
    [tw + topShiftX, h, td + topShiftZ + zf], [-tw + topShiftX, h, td + topShiftZ + zf]
  ];
  const faces = [
    0,1,2, 0,2,3,
    4,6,5, 4,7,6,
    0,4,5, 0,5,1,
    1,5,6, 1,6,2,
    2,6,7, 2,7,3,
    3,7,4, 3,4,0
  ];
  const pos = [];
  faces.forEach(i => pos.push(...v[i]));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function headGeometry() {
  const p = params;
  return frustumGeometry({
    topW: p.width * p.top,
    bottomW: p.width * p.bottom,
    topD: p.depth * 0.92,
    bottomD: p.depth,
    height: p.height * (1 - p.squash * 0.2),
    topShiftX: p.shear * 0.35,
    topShiftZ: -p.taper * 0.08
  });
}

function torsoGeometry() {
  const p = params;
  return frustumGeometry({
    topW: p.width * p.top,
    bottomW: p.width * p.bottom,
    topD: p.depth * 0.92,
    bottomD: p.depth * 0.8,
    height: p.height * (1 - p.squash * 0.18),
    topShiftX: p.shear * 0.45,
    topShiftZ: -0.08 + p.bow * 0.1,
    frontSlope: p.taper * 0.1
  });
}

function pelvisGeometry() {
  const p = params;
  return frustumGeometry({
    topW: p.width * p.top,
    bottomW: p.width * p.bottom,
    topD: p.depth,
    bottomD: p.depth * 0.76,
    height: p.height * (1 - p.squash * 0.18),
    topShiftX: p.shear * 0.35,
    topShiftZ: 0.05,
    frontSlope: 0.08 + p.taper * 0.08
  });
}

function limbGeometry() {
  const p = params;
  const rTop = p.width * 0.5 * p.top;
  const rBottom = p.width * 0.5 * p.bottom;
  const g = new THREE.CylinderGeometry(rTop, rBottom, p.height * (1 - p.squash * 0.2), 6, 1, false);
  const a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const y = a.getY(i);
    const ny = y / Math.max(p.height, 0.001);
    a.setX(i, a.getX(i) + p.shear * ny + p.bow * Math.sin((ny + 0.5) * Math.PI));
    a.setZ(i, a.getZ(i) * (p.depth / Math.max(p.width, 0.001)));
  }
  a.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

function jointGeometry() {
  const p = params;
  const g = new THREE.SphereGeometry(0.5, 12, 8);
  g.scale(p.width, p.height, p.depth);
  return g;
}

function handGeometry() {
  const p = params;
  return frustumGeometry({
    topW: p.width * p.top,
    bottomW: p.width * p.bottom,
    topD: p.depth * 0.92,
    bottomD: p.depth * 0.72,
    height: p.height,
    topShiftX: p.shear * 0.25,
    topShiftZ: p.taper * 0.12
  });
}

function footGeometry() {
  const p = params;
  const g = frustumGeometry({
    topW: p.width * p.top,
    bottomW: p.width * p.bottom,
    topD: p.height * 0.9,
    bottomD: p.height,
    height: p.depth,
    topShiftX: p.shear * 0.22,
    topShiftZ: p.taper * 0.08
  });
  g.rotateX(Math.PI / 2);
  g.translate(0, -p.height * 0.12, 0);
  return g;
}

function neckGeometry() {
  const p = params;
  return new THREE.CylinderGeometry(p.width * 0.45 * p.top, p.width * 0.5 * p.bottom, p.height, 8, 1, false);
}

function currentGeometry() {
  switch (formType) {
    case 'head': return headGeometry();
    case 'torso': return torsoGeometry();
    case 'pelvis': return pelvisGeometry();
    case 'limb': return limbGeometry();
    case 'joint': return jointGeometry();
    case 'hand': return handGeometry();
    case 'foot': return footGeometry();
    case 'neck': return neckGeometry();
    default: return torsoGeometry();
  }
}

function addLineLoop(points, material, parent) {
  parent.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material));
}

function buildGuides() {
  axisGroup = new THREE.Group();
  contourGroup = new THREE.Group();
  root.add(axisGroup, contourGroup);

  const vertical = formType !== 'foot';
  const span = vertical ? params.height : params.depth;
  axisGroup.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(vertical
      ? [new THREE.Vector3(0, -span * 0.62, 0), new THREE.Vector3(0, span * 0.62, 0)]
      : [new THREE.Vector3(0, 0, -span * 0.62), new THREE.Vector3(0, 0, span * 0.62)]),
    guideMaterial
  ));

  axisGroup.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0, Math.max(params.depth, 0.5) * 0.75)]),
    guideMaterial
  ));

  if (formType === 'joint') {
    const r = params.width * 0.5;
    for (const axis of ['y','x']) {
      const pts = [];
      for (let i=0;i<48;i++) {
        const a = i/48*Math.PI*2;
        pts.push(axis === 'y'
          ? new THREE.Vector3(Math.cos(a)*r, 0, Math.sin(a)*params.depth*0.5)
          : new THREE.Vector3(0, Math.cos(a)*params.height*0.5, Math.sin(a)*params.depth*0.5));
      }
      addLineLoop(pts, contourMaterial, contourGroup);
    }
    return;
  }

  const levels = [-0.28, 0, 0.28];
  for (const t of levels) {
    if (formType === 'foot') {
      const z = t * params.depth;
      const w = params.width * (0.86 + t * 0.18) * 0.5;
      const h = params.height * 0.45;
      const pts = [
        new THREE.Vector3(-w,-h,z), new THREE.Vector3(w,-h,z),
        new THREE.Vector3(w,h,z), new THREE.Vector3(-w,h,z)
      ];
      addLineLoop(pts, contourMaterial, contourGroup);
    } else if (formType === 'limb' || formType === 'neck') {
      const y = t * params.height;
      const k = THREE.MathUtils.lerp(params.bottom, params.top, t + 0.5);
      const rx = params.width * 0.5 * k;
      const rz = params.depth * 0.5 * k;
      const pts=[];
      for(let i=0;i<6;i++){
        const a=i/6*Math.PI*2;
        pts.push(new THREE.Vector3(Math.cos(a)*rx,y,Math.sin(a)*rz));
      }
      addLineLoop(pts, contourMaterial, contourGroup);
    } else {
      const y = t * params.height;
      const mix = t + 0.5;
      const w = params.width * THREE.MathUtils.lerp(params.bottom, params.top, mix) * 0.5;
      const d = params.depth * THREE.MathUtils.lerp(0.78, 1.0, mix) * 0.5;
      const pts=[new THREE.Vector3(-w,y,-d),new THREE.Vector3(w,y,-d),new THREE.Vector3(w,y,d),new THREE.Vector3(-w,y,d)];
      addLineLoop(pts, contourMaterial, contourGroup);
    }
  }
}

function rebuild() {
  while (root.children.length) root.remove(root.children[0]);
  const geometry = currentGeometry();
  mesh = new THREE.Mesh(geometry, faceMaterial);
  root.add(mesh);

  edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 20), edgeMaterial);
  root.add(edgeLines);

  buildGuides();
  updateDisplay();
  updateReadout();
}

function updateDisplay() {
  const silhouette = document.querySelector('#silhouette-toggle').checked;
  const wire = document.querySelector('#wire-toggle').checked;
  mesh.material = silhouette ? silhouetteMaterial : wire ? wireMaterial : faceMaterial;
  edgeLines.visible = !silhouette && !wire;
  axisGroup.visible = document.querySelector('#axis-toggle').checked && !silhouette;
  contourGroup.visible = document.querySelector('#contour-toggle').checked && !silhouette;
}

function addRange(container, key, label, min, max, step, help) {
  const row = document.createElement('div');
  row.className = 'range-row';
  row.innerHTML = `<label>${label}<small>${help}</small></label><output>${params[key].toFixed(2)}</output><input type="range" min="${min}" max="${max}" step="${step}" value="${params[key]}">`;
  const input = row.querySelector('input');
  const out = row.querySelector('output');
  input.oninput = () => {
    params[key] = Number(input.value);
    out.textContent = params[key].toFixed(2);
    rebuild();
  };
  container.appendChild(row);
}

function renderControls() {
  const f = document.querySelector('#form-list');
  f.innerHTML = '';
  Object.entries(DEFINITIONS).forEach(([id,d]) => {
    const b = document.createElement('button');
    b.className = 'form-button' + (id === formType ? ' active' : '');
    b.innerHTML = `<b>${d.label}</b><small>${d.desc}</small>`;
    b.onclick = () => {
      formType = id;
      params = { ...DEFINITIONS[id].defaults };
      renderControls();
      rebuild();
    };
    f.appendChild(b);
  });

  document.querySelector('#form-title').textContent = DEFINITIONS[formType].label;
  document.querySelector('#form-desc').textContent = DEFINITIONS[formType].desc;
  document.querySelector('#hud-rule').textContent = DEFINITIONS[formType].rule;
  document.querySelector('#hud-note').textContent = 'Reference language: pale planar faces, dark edges, obvious direction, minimal detail.';

  const p = document.querySelector('#proportion-controls');
  p.innerHTML = '';
  addRange(p,'width','Width',0.3,2.8,0.02,'side-to-side size');
  addRange(p,'height','Height',0.3,3.6,0.02,'vertical size');
  addRange(p,'depth','Depth',0.25,2.4,0.02,'front-to-back size');

  const pr = document.querySelector('#profile-controls');
  pr.innerHTML = '';
  addRange(pr,'top','Top size',0.35,1.4,0.01,'relative size at one end');
  addRange(pr,'middle','Middle size',0.45,1.5,0.01,'kept for shared form vocabulary');
  addRange(pr,'bottom','Bottom size',0.25,1.35,0.01,'relative size at the other end');

  const c = document.querySelector('#character-controls');
  c.innerHTML = '';
  addRange(c,'taper','Taper',0,0.65,0.01,'changes directional narrowing');
  addRange(c,'bulge','Bulge',-0.2,0.45,0.01,'reserved for later organic variants');
  addRange(c,'squash','Squash',-0.4,0.5,0.01,'compresses the main axis');
  addRange(c,'bow','Bow',-0.4,0.4,0.01,'subtle limb curve / torso shift');
  addRange(c,'shear','Shear',-0.5,0.5,0.01,'offsets one end from the other');
}

function updateReadout() {
  document.querySelector('#value-readout').textContent = JSON.stringify({
    form: formType,
    ...Object.fromEntries(Object.entries(params).map(([k,v]) => [k, Number(v.toFixed(2))]))
  }, null, 2);
}

['axis-toggle','contour-toggle','wire-toggle','silhouette-toggle'].forEach(id => {
  document.querySelector('#' + id).onchange = () => {
    if (id === 'wire-toggle' && document.querySelector('#wire-toggle').checked) document.querySelector('#silhouette-toggle').checked = false;
    if (id === 'silhouette-toggle' && document.querySelector('#silhouette-toggle').checked) document.querySelector('#wire-toggle').checked = false;
    updateDisplay();
  };
});

document.querySelector('#reset-view').onclick = () => {
  camera.position.set(4.3,3.0,5.1);
  controls.target.set(0,0,0);
  controls.update();
};
document.querySelector('#reset-form').onclick = () => {
  params = { ...DEFINITIONS[formType].defaults };
  renderControls();
  rebuild();
};
document.querySelector('#copy-values').onclick = async () => {
  const text = document.querySelector('#value-readout').textContent;
  try {
    await navigator.clipboard.writeText(text);
    const b = document.querySelector('#copy-values');
    b.textContent = 'Copied';
    setTimeout(() => b.textContent = 'Copy values', 900);
  } catch {}
};

function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

renderControls();
rebuild();
resize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
