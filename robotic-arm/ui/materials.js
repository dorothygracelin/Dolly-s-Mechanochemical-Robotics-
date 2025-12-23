// Advanced material definitions for lab equipment
export function createCounterweightMaterials(THREE) {
    // Main body material - clean white finish
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.2,
        roughness: 0.1,
        envMapIntensity: 1.0
    });

    // Illuminated window material
    const windowMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ff80,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.6,
        thickness: 0.5,
        emissive: 0x00ff80,
        emissiveIntensity: 0.5
    });

    // Sensor/connection points
    const sensorMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.2
    });

    return {
        body: bodyMaterial,
        window: windowMaterial,
        sensor: sensorMaterial
    };
}

// Create lab environment materials
export function createLabEnvironmentMaterials(THREE) {
    // Metallic work surface
    const workSurfaceMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.3
    });

    // Robot arm materials
    const robotArmMaterial = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        metalness: 0.3,
        roughness: 0.2
    });

    return {
        workSurface: workSurfaceMaterial,
        robotArm: robotArmMaterial
    };
}

// Enhanced lighting setup for lab environment
export function createLabLighting(THREE, scene) {
    // Main overhead light
    const overhead = new THREE.DirectionalLight(0xffffff, 0.8);
    overhead.position.set(0, 10, 0);
    overhead.castShadow = true;
    
    // Lab equipment displays glow
    const displayGlow = new THREE.PointLight(0x00ff80, 0.4);
    displayGlow.position.set(-5, 2, -5);
    
    // Rim lighting for depth
    const rimLight = new THREE.DirectionalLight(0xaaaaff, 0.3);
    rimLight.position.set(-5, 3, 5);

    scene.add(overhead);
    scene.add(displayGlow);
    scene.add(rimLight);

    // Ambient light for general visibility
    const ambient = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambient);

    return {
        overhead,
        displayGlow,
        rimLight,
        ambient
    };
}