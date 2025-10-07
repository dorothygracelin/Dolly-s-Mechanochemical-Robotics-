// Component management for the robotic arm
export class ComponentManager {
    constructor(scene, arm) {
        this.scene = scene;
        this.arm = arm;
        this.attachedComponents = new Map();
    }

    async attachCounterweight(jointIndex) {
        if (this.attachedComponents.has(jointIndex)) {
            return false;
        }

        const counterweight = await createCounterweight(THREE);
        
        // Position relative to joint
        counterweight.position.y = 0.2; // Offset from joint center
        
        // Add to tracking
        this.attachedComponents.set(jointIndex, {
            type: 'counterweight',
            object: counterweight
        });

        // Add to scene
        const joint = this.arm.getJoint(jointIndex);
        joint.add(counterweight);
        
        return true;
    }

    detachComponent(jointIndex) {
        const component = this.attachedComponents.get(jointIndex);
        if (!component) return false;

        const joint = this.arm.getJoint(jointIndex);
        joint.remove(component.object);
        this.attachedComponents.delete(jointIndex);
        
        return true;
    }
}