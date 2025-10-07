/* global console */
import { RoboticArm } from '../index.js';

// safeDocument / safeWindow wrappers to avoid static-analysis errors in non-browser environments
const safeDocument = (typeof globalThis !== 'undefined' && globalThis['document']) ? globalThis['document'] : { getElementById: ()=>null, createElement: ()=>({}), body: {} };
const safeWindow = (typeof globalThis !== 'undefined' && globalThis['window']) ? globalThis['window'] : (typeof globalThis !== 'undefined' ? globalThis : { addEventListener: ()=>{}, innerWidth:1000, innerHeight:800, requestAnimationFrame: (fn)=> (globalThis && globalThis['setTimeout'] ? globalThis['setTimeout'](fn,16) : 0), cancelAnimationFrame: (id)=> (globalThis && globalThis['clearTimeout'] ? globalThis['clearTimeout'](id) : undefined), URL: { createObjectURL: ()=>'' }, webkitURL: { createObjectURL: ()=>'' } });

const canvas = safeDocument.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const autoSolveEl = safeDocument.getElementById('autoSolve');
const maxIterEl = safeDocument.getElementById('maxIter');
const tolEl = safeDocument.getElementById('tol');
const jointSelect = safeDocument.getElementById('jointSelect');
const componentSelect = safeDocument.getElementById('componentSelect');
const attachBtn = safeDocument.getElementById('attachBtn');
const detachBtn = safeDocument.getElementById('detachBtn');
const info = safeDocument.getElementById('info');
const massRow = safeDocument.getElementById('massRow');
const massInput = safeDocument.getElementById('massInput');
const assetInput = safeDocument.getElementById('assetInput');
const previewName = safeDocument.getElementById('previewName');
const previewImage = safeDocument.getElementById('previewImage');
const modelCanvas = safeDocument.getElementById('modelCanvas');

// safeConsole avoids linter/runtime complaints in non-browser LSP/static analysis
const safeConsole = (typeof console !== 'undefined') ? console : { log:()=>{}, warn:()=>{}, error:()=>{}, info:()=>{} };

let uploadedAsset = null; // { type: 'image'|'model', url, file }
let threeRenderer = null; // lazy three.js renderer for model previews
const builtInAssets = {
  counterweight: { type: 'model', url: './assets/counterweight.obj', name: 'counterweight.obj' }
};

// Preview state shared between loaders
let previewState = null; // { scene, camera, modelGroup, renderer }

async function initThreeIfNeeded(){
  if(threeRenderer) return threeRenderer.__THREE__;
  if(!modelCanvas) return null;
  const mod = await import('https://unpkg.com/three@0.154.0/build/three.module.js');
  const THREE = mod.default;
  // create renderer
  threeRenderer = new THREE.WebGLRenderer({ canvas: modelCanvas, antialias: true, alpha: true });
  threeRenderer.setSize(modelCanvas.width, modelCanvas.height);
  threeRenderer.outputEncoding = THREE.sRGBEncoding;
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRenderer.toneMappingExposure = 1.0;
  // store ref to THREE for callers
  threeRenderer.__THREE__ = THREE;
  return THREE;
}

function applyStandardMaterialTo(obj, THREE){
  obj.traverse((node)=>{
    if(node.isMesh){
      // give a metallic, slightly rough PBR material similar to a polished metal counterweight
      node.material = new THREE.MeshStandardMaterial({ color: 0xb6c7d6, metalness: 0.96, roughness: 0.22, emissive: 0x001022, emissiveIntensity: 0.02 });
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function fitObjectToView(obj, camera, THREE){
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6; // factor to pull back a bit
  if(cameraZ < 1) cameraZ = 1;
  camera.position.set(center.x, center.y + maxDim*0.1, center.z + cameraZ);
  camera.lookAt(center.x, center.y, center.z);
}

function createPreviewScene(THREE){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);
  // HDR-like lighting using hemisphere + directional + point
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 0.6);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 10, 7);
  scene.add(dir);
  const rim = new THREE.PointLight(0xaaf0ff, 0.6);
  rim.position.set(-3, -2, 3);
  scene.add(rim);
  return scene;
}

function startPreviewAnimation(THREE){
  if(previewState && threeRenderer){
    const renderer = threeRenderer;
    const scene = previewState.scene;
    const camera = previewState.camera;
    const group = previewState.modelGroup;
    function animate(){
      // if there is no interactive controls, gently auto-rotate the model
      if(group && !previewState.controls) group.rotation.y += 0.008;
      // update orbit controls if present
      if(previewState.controls && typeof previewState.controls.update === 'function'){
        previewState.controls.update();
      }
      renderer.render(scene, camera);
      previewState.raf = safeWindow.requestAnimationFrame(animate);
    }
    if(previewState.raf) safeWindow.cancelAnimationFrame(previewState.raf);
    animate();
  }
}

const arm = new RoboticArm([140, 100, 70]);
arm.setAngles([0, 0, 0]);
let target = arm.getEndEffector().slice();
let dragging = false;
let lastMouse = null;
let components = []; // { jointIndex, type }

// populate joint selector
function refreshJointSelect(){
  if(!jointSelect) return;
  jointSelect.innerHTML = '';
  for(let i=0;i<=arm.n-1;i++){
    const opt = safeDocument.createElement('option');
    opt.value = i;
    opt.textContent = `Joint ${i} (index ${i})`;
    jointSelect.appendChild(opt);
  }
}
refreshJointSelect();

function resizeCanvas(){
  // keep logical size
}

function worldToCanvas(p){
  // center origin to middle-left-ish for nicer view
  const offsetX = 200;
  const offsetY = canvas.height/2;
  return [offsetX + p[0], offsetY - p[1]];
}

function canvasToWorld(p){
  const offsetX = 200;
  const offsetY = canvas.height/2;
  return [p[0] - offsetX, offsetY - p[1]];
}

if(canvas) canvas.addEventListener('mousedown', (e)=>{
  dragging = true;
  lastMouse = [e.offsetX, e.offsetY];
  const w = canvasToWorld(lastMouse);
  target = w;
});
if(safeWindow && safeWindow.addEventListener){
  safeWindow.addEventListener('mousemove', (e)=>{
    if(!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const m = [e.clientX - rect.left, e.clientY - rect.top];
    lastMouse = m;
    target = canvasToWorld(m);
  });
  safeWindow.addEventListener('mouseup', ()=>{ dragging = false; });
}

if(attachBtn) attachBtn.addEventListener('click', ()=>{
  const idx = parseInt(jointSelect.value,10);
  const type = componentSelect.value;
  // don't attach twice to same joint
  if(!components.find(c=>c.jointIndex===idx)){
    const comp = { jointIndex: idx, type };
    if(type === 'counterweight'){
      comp.mass = parseFloat(massInput.value) || 0;
    }
    if(uploadedAsset){
      comp.asset = uploadedAsset;
    }
    components.push(comp);
  }
});

if(detachBtn) detachBtn.addEventListener('click', ()=>{
  const idx = parseInt(jointSelect.value,10);
  components = components.filter(c=>c.jointIndex!==idx);
});

function draw(){
  ctx.clearRect(0,0,canvas.width, canvas.height);
  // maybe solve
  if(autoSolveEl.checked){
    // build per-joint masses from attached components
    const jointMasses = new Array(arm.n).fill(0);
    for(const c of components){
      if(c.type === 'counterweight' && typeof c.mass === 'number'){
        if(c.jointIndex >= 0 && c.jointIndex < jointMasses.length) jointMasses[c.jointIndex] += c.mass;
      }
    }
    arm.solveIK_CCD(target, { maxIterations: parseInt(maxIterEl.value,10), tolerance: parseFloat(tolEl.value), damping: 1.0, jointMasses, massFactor: 0.8 });
  }
  arm.forwardKinematics();
  const joints = arm.jointPositions;
  // draw target
  const tc = worldToCanvas(target);
  ctx.fillStyle = 'rgba(220,20,60,0.9)';
  ctx.beginPath(); ctx.arc(tc[0], tc[1], 6, 0, Math.PI*2); ctx.fill();

  // draw segments
  ctx.lineWidth = 6;
  for(let i=0;i<arm.n;i++){
    const a = worldToCanvas(joints[i]);
    const b = worldToCanvas(joints[i+1]);
    ctx.strokeStyle = '#2b6';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  // draw joints
  for(let i=0;i<joints.length;i++){
    const p = worldToCanvas(joints[i]);
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI*2); ctx.fill();
  }

  // draw components
  for(const comp of components){
    const jointPos = joints[comp.jointIndex];
    const p = worldToCanvas(jointPos);
    // simple rectangle icon
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(0);
    ctx.fillStyle = comp.type==='camera' ? '#0af' : comp.type==='gripper' ? '#fa0' : '#8a2be2';
    ctx.fillRect(-12, -30, 24, 16);
    ctx.fillStyle = '#111';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(comp.type, 0, -18);
    ctx.restore();
  }

  // info
  const eff = arm.getEndEffector();
  info.innerHTML = `Target: ${target.map(v=>v.toFixed(1)).join(', ')}<br>End effector: ${eff.map(v=>v.toFixed(1)).join(', ')}<br>Distance: ${arm.distanceTo(target).toFixed(2)}`;

  safeWindow.requestAnimationFrame(draw);
}

// resize handling
function fitCanvas(){
  if (safeWindow) {
    canvas.width = Math.min((safeWindow.innerWidth || 1000) - 320, 1000);
    canvas.height = Math.min((safeWindow.innerHeight || 800) - 120, 800);
  } else {
    // fallback for non-browser environments
    canvas.width = 1000;
    canvas.height = 800;
  }
}
if (safeWindow && safeWindow.addEventListener) {
  safeWindow.addEventListener('resize', ()=>{ fitCanvas(); });
  fitCanvas();
  safeWindow.requestAnimationFrame(draw);
}

// allow clicking attachment by selecting current nearest joint (bonus)
if(canvas) canvas.addEventListener('dblclick', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const m = [e.clientX - rect.left, e.clientY - rect.top];
  const w = canvasToWorld(m);
  arm.forwardKinematics();
  let best = { idx:0, d: Infinity };
  for(let i=0;i<arm.jointPositions.length;i++){
    const jp = arm.jointPositions[i];
    const d = Math.hypot(jp[0]-w[0], jp[1]-w[1]);
    if(d < best.d){ best = { idx:i, d }; }
  }
  jointSelect.value = best.idx;
});

// show/hide mass input when selecting counterweight
if(componentSelect) componentSelect.addEventListener('change', ()=>{
  if(componentSelect.value === 'counterweight') massRow.style.display = '';
  else massRow.style.display = 'none';
});

// Asset upload handling
if(assetInput) assetInput.addEventListener('change', async (ev)=>{
  const f = ev.target.files && ev.target.files[0];
  if(!f) return;
  const url = ((safeWindow.URL || safeWindow.webkitURL) && (safeWindow.URL || safeWindow.webkitURL).createObjectURL) ? (safeWindow.URL || safeWindow.webkitURL).createObjectURL(f) : '';
  uploadedAsset = { file: f, url };
  previewName.textContent = f.name;
  // image?
  if(f.type.startsWith('image/')){
    previewImage.src = url; previewImage.style.display = '';
    modelCanvas.style.display = 'none';
    uploadedAsset.type = 'image';
    return;
  }
  // glTF/GLB -> show using three.js rendered to modelCanvas (lazy load three)
  if(f.name.match(/\.gltf$|\.glb$/i)){
    uploadedAsset.type = 'model';
    previewImage.style.display = 'none';
    modelCanvas.style.display = '';
    try{
      // lazy import GLTFLoader and init three
      const THREE = await initThreeIfNeeded();
      if(!THREE) throw new Error('Three initialization failed');
      const { GLTFLoader } = await import('https://unpkg.com/three@0.154.0/examples/jsm/loaders/GLTFLoader.js');
      const scene = createPreviewScene(THREE);
      const camera = new THREE.PerspectiveCamera(45, modelCanvas.width / modelCanvas.height, 0.1, 1000);
      const loader = new GLTFLoader();
      loader.parse(await f.arrayBuffer(), '', (gltf)=>{
        const group = gltf.scene;
        applyStandardMaterialTo(group, THREE);
        // cleanup previous preview
        if(previewState){
          if(previewState.controls && typeof previewState.controls.dispose === 'function') previewState.controls.dispose();
          if(previewState.scene && previewState.modelGroup) previewState.scene.remove(previewState.modelGroup);
          if(previewState.raf) safeWindow.cancelAnimationFrame(previewState.raf);
        }
        scene.add(group);
        // create orbit controls
        (async ()=>{
          try{
            const { OrbitControls } = await import('https://unpkg.com/three@0.154.0/examples/jsm/controls/OrbitControls.js');
            const controls = new OrbitControls(camera, threeRenderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.06;
            controls.enablePan = true;
            controls.autoRotate = false;
            previewState = { scene, camera, modelGroup: group, controls };
            fitObjectToView(group, camera, THREE);
            startPreviewAnimation();
          }catch(e){
            // fallback to non-interactive preview
            previewState = { scene, camera, modelGroup: group };
            fitObjectToView(group, camera, THREE);
            startPreviewAnimation();
          }
        })();
      }, (err)=>{ safeConsole.warn('gltf load err', err); });
  }catch(err){ safeConsole.error('three load failed', err); uploadedAsset = null; }
  }
});

// allow choosing built-in assets (quick demo) by double-clicking preview name
if(previewName) previewName.addEventListener('dblclick', async ()=>{
  // toggle built-in counterweight preview
  const asset = builtInAssets.counterweight;
  if(!asset) return;
  uploadedAsset = { type: asset.type, url: asset.url, file: null, name: asset.name };
  previewName.textContent = asset.name + ' (built-in)';
  previewImage.style.display = 'none';
  modelCanvas.style.display = '';
  try{
    const THREE = await initThreeIfNeeded();
    if(!THREE) throw new Error('Three initialization failed');
    const { OBJLoader } = await import('https://unpkg.com/three@0.154.0/examples/jsm/loaders/OBJLoader.js');
    const scene = createPreviewScene(THREE);
    const camera = new THREE.PerspectiveCamera(45, modelCanvas.width / modelCanvas.height, 0.1, 1000);
    const loader = new OBJLoader();
    loader.load(asset.url, (obj)=>{
      applyStandardMaterialTo(obj, THREE);
      // cleanup previous preview
      if(previewState){
        if(previewState.controls && typeof previewState.controls.dispose === 'function') previewState.controls.dispose();
        if(previewState.scene && previewState.modelGroup) previewState.scene.remove(previewState.modelGroup);
        if(previewState.raf) safeWindow.cancelAnimationFrame(previewState.raf);
      }
      scene.add(obj);
      (async ()=>{
        try{
          const { OrbitControls } = await import('https://unpkg.com/three@0.154.0/examples/jsm/controls/OrbitControls.js');
          const controls = new OrbitControls(camera, threeRenderer.domElement);
          controls.enableDamping = true;
          controls.dampingFactor = 0.06;
          previewState = { scene, camera, modelGroup: obj, controls };
          fitObjectToView(obj, camera, THREE);
          startPreviewAnimation();
        }catch(e){
          previewState = { scene, camera, modelGroup: obj };
          fitObjectToView(obj, camera, THREE);
          startPreviewAnimation();
        }
      })();
    }, undefined, (err)=>{ safeConsole.error('obj load err', err); });
  }catch(err){ safeConsole.error('obj preview failed', err); }
});

// helpful: click the "Attach" button will attach currently selected component at jointSelect
