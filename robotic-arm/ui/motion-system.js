// Industrial-grade motion system for mining robots
export class IndustrialMotionSystem {
    constructor(config = {}) {
        this.config = {
            maxSpeed: config.maxSpeed || 1.0,          // Maximum speed factor
            acceleration: config.acceleration || 0.2,   // Acceleration rate
            deceleration: config.deceleration || 0.3,  // Deceleration rate (higher for safety)
            loadFactor: config.loadFactor || 1.0,      // Current load factor (1.0 = nominal)
            safetyMargin: config.safetyMargin || 0.1,  // Safety margin for movements
            ...config
        };

        this.currentState = {
            velocity: 0,
            acceleration: 0,
            stress: new Map(),  // Track joint stress
            position: new Map() // Current joint positions
        };

        this.safetyLimits = {
            maxStress: 0.9,     // Maximum allowed joint stress
            maxAcceleration: 0.8 // Maximum allowed acceleration
        };
    }

    // Calculate motion profile for smooth industrial movement
    calculateMotionProfile(start, end, duration) {
        const distance = Math.abs(end - start);
        const direction = Math.sign(end - start);
        
        // Trapezoidal motion profile for smooth acceleration/deceleration
        const accelTime = Math.min(
            Math.sqrt(distance / this.config.acceleration),
            duration * 0.3  // Max 30% of time for acceleration
        );
        const decelTime = accelTime * (this.config.acceleration / this.config.deceleration);
        
        return {
            accelTime,
            decelTime,
            cruiseTime: duration - (accelTime + decelTime),
            direction,
            distance
        };
    }

    // Update motion with load and safety considerations
    updateMotion(jointId, currentPos, targetPos, timeDelta) {
        // Get or initialize joint stress
        let jointStress = this.currentState.stress.get(jointId) || 0;
        
        // Calculate safe motion profile
        const profile = this.calculateMotionProfile(currentPos, targetPos, 1.0);
        
        // Adjust for current load
        const loadAdjustedSpeed = this.config.maxSpeed * (1 / Math.max(this.config.loadFactor, 0.1));
        
        // Calculate new velocity with safety constraints
        let newVelocity = this.currentState.velocity;
        const distanceToTarget = targetPos - currentPos;
        
        if (Math.abs(distanceToTarget) > this.config.safetyMargin) {
            // Accelerate or decelerate based on profile
            if (profile.cruiseTime > 0) {
                newVelocity += this.config.acceleration * timeDelta * profile.direction;
            } else {
                newVelocity -= this.config.deceleration * timeDelta * Math.sign(newVelocity);
            }
            
            // Apply load-adjusted speed limit
            newVelocity = Math.min(Math.abs(newVelocity), loadAdjustedSpeed) * Math.sign(newVelocity);
        } else {
            // Near target, slow down
            newVelocity *= 0.5;
        }
        
        // Update stress model
        jointStress = Math.min(
            jointStress + Math.abs(newVelocity) * 0.1,
            this.safetyLimits.maxStress
        );
        
        // Store updated state
        this.currentState.velocity = newVelocity;
        this.currentState.stress.set(jointId, jointStress);
        
        // Calculate new position with safety checks
        const movement = newVelocity * timeDelta;
        const safePosition = currentPos + movement;
        
        // Return safe movement data
        return {
            position: safePosition,
            velocity: newVelocity,
            stress: jointStress,
            isAtRisk: jointStress > this.safetyLimits.maxStress * 0.8
        };
    }

    // Get diagnostic data for monitoring
    getDiagnostics(jointId) {
        return {
            stress: this.currentState.stress.get(jointId) || 0,
            velocity: this.currentState.velocity,
            loadFactor: this.config.loadFactor
        };
    }

    // Emergency stop function
    emergencyStop() {
        this.currentState.velocity = 0;
        this.currentState.acceleration = 0;
        this.config.loadFactor = 1.0;
        return true;
    }
}