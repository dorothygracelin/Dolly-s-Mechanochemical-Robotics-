import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createMiningRobotMaterials, createMiningRobotGeometry } from './mining-components.js';
import { createCounterweight, CounterweightConfig } from './shared-counterweight.js';

export class Viewport3D {
    constructor(canvas) {
        console.log('Creating Viewport3D instance...');
        
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        console.log('Setting up components...');
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupControls();
        this.createEnvironment();
        
        // Start animation loop
        this.animate = this.animate.bind(this);
        this.isAnimating = true;
        this.lastTime = performance.now();
        console.log('Starting animation loop...');
        this.animate();
        
        // Handle resize
        this.onResize = this.onResize.bind(this);
        window.addEventListener('resize', this.onResize);
        
        console.log('Viewport3D initialization complete');
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45, // FOV
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 3, 7);
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    setupLights() {
        // Ambient light for general visibility
        const ambient = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambient);

        // Main directional light with shadows
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);
        
        // Add subtle rim light for crystal highlights
        const crystalLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        crystalLight.position.set(-5, 3, -5);
        this.scene.add(crystalLight);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 20;
    }

    createEnvironment() {
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.4
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add grid helper
        const grid = new THREE.GridHelper(20, 20, 0x666666, 0x444444);
        grid.position.y = 0.01; // Slightly above ground to prevent z-fighting
        this.scene.add(grid);

        // Create the mining robot
        this.createMiningRobot();
    }

    createMiningRobot() {
        const materials = createMiningRobotMaterials(THREE);
        const geometry = createMiningRobotGeometry(THREE);
        
        this.robotGroup = new THREE.Group();
        
        const base = geometry.createBase(materials);
        const arm = geometry.createArm(materials);
        const sensors = geometry.createSensorSystem(materials);
        
        // Create and position counterweight
        this.counterweight = createCounterweight(THREE);
        this.counterweight.position.set(0, 1.5, 0); // Initial position
        this.counterweight.rotation.x = Math.PI / 6; // Slight tilt for visibility
        
        // Store initial position for relative movement
        this.counterweight.userData.initialY = 1.5;
        
        // Position components
        base.position.y = 0;
        arm.position.y = 0.5;
        sensors.position.y = 2;
        
        // Method to update counterweight position
        this.updateCounterweightPosition = (axis, value) => {
            if (this.counterweight) {
                if (axis === 'y') {
                    // Add offset to Y position to maintain height
                    this.counterweight.position[axis] = this.counterweight.userData.initialY + value;
                } else {
                    this.counterweight.position[axis] = value;
                }
            }
        };
        
        this.robotGroup.add(base);
        this.robotGroup.add(arm);
        this.robotGroup.add(sensors);
        this.robotGroup.add(this.counterweight);
        
        // Add glow animation
        this.glowPhase = 0;
        
        // Add to scene
        this.scene.add(this.robotGroup);
    }

    onResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height, false);
    }

    animate() {
        requestAnimationFrame(this.animate);
        
        // Update controls
        this.controls.update();
        
        // Animate counterweight glow and crystal rotation
        if (this.counterweight) {
            const glowConfig = {
                speed: 0.01,    // Slower, more subtle pulse
                min: 0.4,       // Higher minimum for consistent glow
                max: 1.2        // Higher maximum for brighter peaks
            };
            
            this.glowPhase += glowConfig.speed;
            const intensity = 
                glowConfig.min + 
                (Math.sin(this.glowPhase) + 1) / 2 * 
                (glowConfig.max - glowConfig.min);
            
            // Find the crystal core
            this.counterweight.traverse(child => {
                // Update emissive materials
                if (child.material && child.material.emissive) {
                    child.material.emissiveIntensity = intensity;
                    
                    // Add slight color shift based on angle
                    const hue = (Math.sin(this.glowPhase * 0.5) + 1) * 0.1;
                    child.material.emissive.setHSL(0.6 + hue, 1, 0.5);
                }
                
                // Update point lights
                if (child instanceof THREE.PointLight) {
                    child.intensity = intensity * 0.8;  // Slightly dampen light intensity
                }
                
                // Rotate crystal core
                if (child.userData.rotationSpeed) {
                    child.rotation.x += child.userData.rotationSpeed.x;
                    child.rotation.y += child.userData.rotationSpeed.y;
                }
            });
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}