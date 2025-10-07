import * as THREE from 'three';

export function createCounterweight(THREE) {
    const group = new THREE.Group();

    // Create the truncated pyramid shape
    const baseWidth = 0.4;
    const topWidth = 0.3;
    const height = 0.3;
    const depth = 0.4;

    // Create geometry for the main body
    const bodyGeometry = new THREE.BufferGeometry();
    
    // Define vertices for truncated pyramid
    const vertices = new Float32Array([
        // Front face (bottom)
        -baseWidth/2, -height/2, depth/2,
        baseWidth/2, -height/2, depth/2,
        topWidth/2, height/2, depth/2,
        -topWidth/2, height/2, depth/2,
        
        // Back face (bottom)
        -baseWidth/2, -height/2, -depth/2,
        baseWidth/2, -height/2, -depth/2,
        topWidth/2, height/2, -depth/2,
        -topWidth/2, height/2, -depth/2,
        
        // Top vertices for window recess
        -topWidth/2 + 0.02, height/2 - 0.02, depth/2 - 0.02,
        topWidth/2 - 0.02, height/2 - 0.02, depth/2 - 0.02,
        topWidth/2 - 0.02, height/2 - 0.02, -depth/2 + 0.02,
        -topWidth/2 + 0.02, height/2 - 0.02, -depth/2 + 0.02
    ]);

    // Define faces (triangles)
    const indices = new Uint16Array([
        // Front face
        0, 1, 2,
        0, 2, 3,
        
        // Back face
        5, 4, 7,
        5, 7, 6,
        
        // Right side
        1, 5, 6,
        1, 6, 2,
        
        // Left side
        4, 0, 3,
        4, 3, 7,
        
        // Bottom
        4, 5, 1,
        4, 1, 0,
        
        // Top recessed area
        8, 9, 10,
        8, 10, 11
    ]);

    // Calculate normals for proper lighting
    const normalVectors = [];
    for (let i = 0; i < vertices.length; i += 3) {
        normalVectors.push(0, 1, 0); // Simplified normals
    }
    const normals = new Float32Array(normalVectors);

    // Set attributes
    bodyGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    bodyGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    bodyGeometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // Create materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        metalness: 0.2,
        roughness: 0.3,
        side: THREE.DoubleSide
    });

    // Create the main body mesh
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Create the illuminated window
    const windowGeometry = new THREE.PlaneGeometry(topWidth - 0.04, depth - 0.04);
    const windowMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ff80,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.5,
        thickness: 0.1,
        emissive: 0x00ff80,
        emissiveIntensity: 0.5
    });

    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.rotation.x = -Math.PI / 2;
    window.position.y = height/2 - 0.01;
    group.add(window);

    // Add illumination
    const light = new THREE.PointLight(0x00ff80, 1, 1);
    light.position.set(0, height/2 - 0.05, 0);
    group.add(light);

    // Add edge highlights
    const edgeGeometry = new THREE.EdgesGeometry(bodyGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    group.add(edges);

    return group;
}

// Animation parameters for glow effect
export const counterweightAnimation = {
    glowIntensity: {
        min: 0.3,
        max: 0.7,
        speed: 0.002
    }
};