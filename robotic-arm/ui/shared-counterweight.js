import * as THREE from 'three';

// Shared configuration for counterweight appearance
export const CounterweightConfig = {
    dimensions: {
        sphereRadius: 0.3,
        coreRadius: 0.12,
        cavityDepth: 0.15,
        cavityRadius: 0.13,
    },
    materials: {
        body: {
            color: 0xeeeeee,
            metalness: 0.1,
            roughness: 0.3,
            envMapIntensity: 0.8
        },
        core: {
            color: 0xfafafa,  // Almost pure white for better light interaction
            metalness: 1.0,   // Fully metallic for maximum reflectivity
            roughness: 0.1,   // Very smooth for sharp reflections
            emissive: 0x3366ff,  // Richer blue tone for the glow
            emissiveIntensity: 0.7,  // Stronger glow
            envMapIntensity: 2.0,  // Enhanced environmental reflections
            transparent: true,  // Enable transparency
            opacity: 0.9,      // Slight transparency for crystal effect
        },
        cavity: {
            color: 0x111111,     // Darker for better contrast
            metalness: 0.95,     // More metallic for subtle reflections
            roughness: 0.3,      // Slightly rougher to diffuse light
            envMapIntensity: 0.8, // Subtle environment reflections
            side: THREE.DoubleSide // Render both sides for better depth
        }
    },
    animation: {
        glowIntensity: {
            min: 0.2,
            max: 1.0,
            speed: 0.01
        }
    }
};

export function createCounterweight(THREE) {
    const group = new THREE.Group();
    const config = CounterweightConfig;
    const dims = config.dimensions;

    // Create the main sphere body
    const sphereGeometry = new THREE.SphereGeometry(dims.sphereRadius, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial(config.materials.body);
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    
    // Create the cavity (slightly larger than core for visual depth)
    const cavityGeometry = new THREE.SphereGeometry(dims.cavityRadius, 32, 32);
    const cavityMaterial = new THREE.MeshStandardMaterial(config.materials.cavity);
    const cavity = new THREE.Mesh(cavityGeometry, cavityMaterial);
    
    // Position cavity slightly inside the sphere
    cavity.position.z = -dims.cavityDepth;
    
    // Create the crystalline core with more detail
    const coreGeometry = new THREE.IcosahedronGeometry(dims.coreRadius, 2);  // Increased detail level
    const coreMaterial = new THREE.MeshPhysicalMaterial(config.materials.core);  // Using PhysicalMaterial for better refractions
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    
    // Create a smaller inner core for depth effect
    const innerCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(dims.coreRadius * 0.6, 1),
        new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 1.0,
            roughness: 0.0,
            emissive: 0x3366ff,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.7
        })
    );
    core.add(innerCore);
    
    // Position core slightly behind cavity opening
    core.position.z = -(dims.cavityDepth - 0.02);
    
    // Add subtle rotation to core for dynamic appearance
    core.rotation.x = Math.PI / 6;
    core.rotation.y = Math.PI / 4;
    
    // Add subtle continuous rotation animation
    core.userData.rotationSpeed = {
        x: 0.0002,  // Very slow rotation
        y: 0.0003
    };
    
    // Create point light for core glow
    const light = new THREE.PointLight(0x4444ff, 1, 1);
    light.position.copy(core.position);
    
    // Add all components to group
    group.add(sphere);
    group.add(cavity);
    group.add(core);
    group.add(light);
    
    // Make core and light available for animation
    group.userData.core = core;
    group.userData.light = light;
    
    // Cast shadows
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    core.castShadow = true;
    
    return group;
}