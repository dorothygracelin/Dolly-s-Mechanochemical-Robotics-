/* global console */
import { RoboticArm } from '@robotic-arm/index.js';
import { Viewport3D } from './viewport3d.js';

// Initialize 3D viewport
let viewport3d = null;

// Initialize viewport and controls when DOM is ready
async function initViewport() {
    const canvas = document.getElementById('main3d');
    if (!canvas) {
        console.error('Could not find main3d canvas element');
        return;
    }

    if (!viewport3d) {
        try {
            console.log('Initializing 3D viewport...');
            
            // Set initial canvas size
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            } else {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            
            // Force the canvas to be visible
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            
            viewport3d = new Viewport3D(canvas);
            console.log('3D viewport initialized successfully');
            
            // Initialize position controls
            initPositionControls();
        } catch (error) {
            console.error('Error initializing 3D viewport:', error);
            console.error('Error details:', error.stack);
        }
    }
}

// Initialize position controls
function initPositionControls() {
    const axes = ['X', 'Y', 'Z'];
    axes.forEach(axis => {
        const slider = document.getElementById(`pos${axis}`);
        const display = document.getElementById(`pos${axis}Value`);
        
        if (slider && display) {
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                display.textContent = value.toFixed(1);
                if (viewport3d) {
                    viewport3d.updateCounterweightPosition(axis.toLowerCase(), value);
                }
            });
        }
    });
}

// Wait for DOM and assets to load
window.addEventListener('load', initViewport);

// Handle window resize
window.addEventListener('resize', () => {
    if (viewport3d) {
        viewport3d.onResize();
    }
});

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
  
  const main3dCanvas = safeDocument.getElementById('main3d');
  if(!main3dCanvas) return null;
  
  const mod = await import('three');
  const THREE = mod;
  
  // Create renderer with advanced features
  threeRenderer = new THREE.WebGLRenderer({
    canvas: main3dCanvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false
  });
  
  // Set up high-quality rendering
  threeRenderer.setPixelRatio(window.devicePixelRatio);
  threeRenderer.setSize(main3dCanvas.clientWidth, main3dCanvas.clientHeight);
  threeRenderer.outputEncoding = THREE.sRGBEncoding;
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRenderer.toneMappingExposure = 1.2;
  threeRenderer.shadowMap.enabled = true;
  threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Store ref to THREE for callers
  threeRenderer.__THREE__ = THREE;
  return THREE;
}

function applyStandardMaterialTo(obj, THREE){
  const materials = createCounterweightMaterials(THREE);
  
  obj.traverse((node)=>{
    if(node.isMesh){
      // Check mesh name to apply appropriate material
      if(node.name.includes('window') || node.name.includes('display')) {
        node.material = materials.window;
      } else if(node.name.includes('sensor') || node.name.includes('port')) {
        node.material = materials.sensor;
      } else {
        node.material = materials.body;
      }
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

import { createCounterweightMaterials, createLabEnvironmentMaterials, createLabLighting } from './materials.js';
import { createMiningRobotMaterials, createMiningRobotGeometry } from './mining-components.js';

function createPreviewScene(THREE){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a); // Industrial environment
  
  // Create enhanced lighting for industrial setting
  const lights = createLabLighting(THREE, scene);
  
  // Add mining environment
  const miningEnv = new THREE.Group();
  
  // Create industrial floor
  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.7,
    roughness: 0.4,
    envMapIntensity: 0.8
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -10;
  floor.receiveShadow = true;
  miningEnv.add(floor);

  // Create mining robot components
  const materials = createMiningRobotMaterials(THREE);
  const geometry = createMiningRobotGeometry(THREE);
  
  const base = geometry.createBase(materials);
  const arm = geometry.createArm(materials);
  const sensors = geometry.createSensorSystem(materials);
  
  // Position components
  base.position.y = -8; // Just above floor
  arm.position.set(0, -8, 0); // Attached to base
  sensors.position.set(0, 2, 0); // At end of arm
  
  // Add to environment
  miningEnv.add(base);
  miningEnv.add(arm);
  miningEnv.add(sensors);
  
  // Add environment to scene
  scene.add(miningEnv);
  
  return scene;
}

function startPreviewAnimation(THREE){
  if(previewState && threeRenderer){
    const renderer = threeRenderer;
    const scene = previewState.scene;
    const camera = previewState.camera;
    const group = previewState.modelGroup;
    function animate(){
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
      lastUpdateTime = currentTime;

      if(group && !previewState.controls) {
        // Update motion with industrial constraints
        const currentRotation = group.rotation.y;
        const targetRotation = currentRotation + 0.008;
        
        const motion = motionSystem.updateMotion(
          'preview',
          currentRotation,
          targetRotation,
          deltaTime
        );

        // Apply motion with load-aware movement
        group.rotation.y = motion.position;
        
        // Visual feedback for stress
        if(motion.stress > 0.5) {
          // Could add visual stress indicators here
          group.material = materials.hazardStripes;
        }
      }

      // Update industrial motion controls
      if(previewState.controls && typeof previewState.controls.update === 'function'){
        const controlMotion = motionSystem.updateMotion(
          'controls',
          0,
          1,
          deltaTime
        );
        
        // Apply industrial motion constraints to controls
        previewState.controls.dampingFactor = 0.05 + (controlMotion.stress * 0.1);
        previewState.controls.update();
      }

      renderer.render(scene, camera);
      previewState.raf = safeWindow.requestAnimationFrame(animate);
    }
    if(previewState.raf) safeWindow.cancelAnimationFrame(previewState.raf);
    animate();
  }
}

import { IndustrialMotionSystem } from './motion-system.js';

const arm = new RoboticArm([140, 100, 70]);
arm.setAngles([0, 0, 0]);
let target = arm.getEndEffector().slice();
let dragging = false;
let lastMouse = null;
let components = []; // { jointIndex, type }

// Initialize industrial motion system
const motionSystem = new IndustrialMotionSystem({
    maxSpeed: 0.8,        // Conservative max speed for mining operations
    acceleration: 0.15,   // Gentle acceleration for heavy loads
    deceleration: 0.25,   // Stronger deceleration for safety
    loadFactor: 1.2,      // Account for mining equipment weight
    safetyMargin: 0.15    // Wider safety margin for industrial setting
});

// Track last update time for motion calculations
let lastUpdateTime = performance.now();

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
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
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
              const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
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
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
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
            const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
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
