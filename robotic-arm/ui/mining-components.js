import * as THREE from 'three';

export function createMiningRobotMaterials(THREE) {
    // Industrial-grade materials
    return {
        mainBody: new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,  // Dark industrial gray
            metalness: 0.7,
            roughness: 0.4,
            envMapIntensity: 0.8
        }),
        joints: new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,  // Darker for joints
            metalness: 0.8,
            roughness: 0.3
        }),
        wheels: new THREE.MeshStandardMaterial({
            color: 0x111111,  // Almost black for rubber
            metalness: 0.1,
            roughness: 0.9
        }),
        sensors: new THREE.MeshStandardMaterial({
            color: 0xcccccc,  // Light gray for sensor housing
            metalness: 0.9,
            roughness: 0.2
        }),
        hazardStripes: new THREE.MeshStandardMaterial({
            color: 0xffd700,  // Safety yellow
            metalness: 0.1,
            roughness: 0.7,
            emissive: 0x3a3a00,
            emissiveIntensity: 0.2
        })
    };
}

export function createMiningRobotGeometry(THREE) {
    const robotGroup = new THREE.Group();
    
    // Mobile Base
    const baseGeometry = new THREE.BoxGeometry(4, 2, 6);
    const baseGroup = new THREE.Group();
    
    // Wheels (4 corners)
    const wheelGeometry = new THREE.CylinderGeometry(1, 1, 0.5, 16);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelPositions = [
        [-2, -0.5, -2.5],
        [2, -0.5, -2.5],
        [-2, -0.5, 2.5],
        [2, -0.5, 2.5]
    ];

    // Arm Segments with protective covering
    const armSegments = [
        { length: 3, width: 0.8, angle: 0 },
        { length: 2.5, width: 0.7, angle: 0.5 },
        { length: 2, width: 0.6, angle: -0.3 }
    ];

    // Sensor Housing
    const sensorHousing = new THREE.BoxGeometry(1, 1, 1);
    const sensorGroup = new THREE.Group();
    
    return {
        createBase: (materials) => {
            const base = new THREE.Mesh(baseGeometry, materials.mainBody);
            wheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(wheelGeometry, materials.wheels);
                wheel.position.set(...pos);
                baseGroup.add(wheel);
            });
            baseGroup.add(base);
            return baseGroup;
        },
        
        createArm: (materials) => {
            const armGroup = new THREE.Group();
            let prevY = 2; // Start height above base
            
            armSegments.forEach((segment, i) => {
                const armGeometry = new THREE.BoxGeometry(segment.width, segment.length, segment.width);
                const arm = new THREE.Mesh(armGeometry, materials.mainBody);
                
                // Position and rotate segment
                arm.position.y = prevY + segment.length / 2;
                arm.rotation.z = segment.angle;
                
                // Add joint connection
                const jointGeometry = new THREE.SphereGeometry(segment.width / 1.5, 16, 16);
                const joint = new THREE.Mesh(jointGeometry, materials.joints);
                joint.position.y = prevY;
                
                armGroup.add(joint);
                armGroup.add(arm);
                
                prevY += segment.length;
            });
            
            return armGroup;
        },
        
        createSensorSystem: (materials) => {
            const sensor = new THREE.Mesh(sensorHousing, materials.sensors);
            const lens = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16),
                new THREE.MeshPhysicalMaterial({
                    color: 0x000000,
                    metalness: 0,
                    roughness: 0.1,
                    transmission: 0.5
                })
            );
            lens.rotation.x = Math.PI / 2;
            lens.position.z = 0.5;
            
            sensorGroup.add(sensor);
            sensorGroup.add(lens);
            return sensorGroup;
        }
    };
}