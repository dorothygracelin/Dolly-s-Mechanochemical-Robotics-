/*
Simple 2D Robotic Arm simulation with CCD inverse kinematics.
Author: generated
*/

const EPS = 1e-9;
function vecLength(v) { return Math.hypot(v[0], v[1]); }
function sub(a,b){return [a[0]-b[0], a[1]-b[1]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1];}
function crossZ(a,b){return a[0]*b[1]-a[1]*b[0];}
function angleBetween(a,b){
  const da = vecLength(a), db = vecLength(b);
  if(da < EPS || db < EPS) return 0;
  let cos = dot(a,b)/(da*db);
  cos = Math.max(-1, Math.min(1, cos));
  const s = crossZ(a,b);
  let ang = Math.acos(cos);
  return s < 0 ? -ang : ang;
}

class RoboticArm {
  constructor(lengths){
    if(!Array.isArray(lengths) || lengths.length === 0) throw new Error('lengths must be a non-empty array');
    this.lengths = lengths.slice();
    this.n = this.lengths.length;
    this.angles = new Array(this.n).fill(0); // radians
    this.jointPositions = [];
    this.origin = [0,0];
  }

  setAngles(angles){
    if(!Array.isArray(angles) || angles.length !== this.n) throw new Error('angles length mismatch');
    this.angles = angles.slice();
    return this.forwardKinematics();
  }

  forwardKinematics(){
    let pos = this.origin.slice();
    this.jointPositions = [pos.slice()];
    let angleAccum = 0;
    for(let i=0;i<this.n;i++){
      angleAccum += this.angles[i];
      const dx = this.lengths[i]*Math.cos(angleAccum);
      const dy = this.lengths[i]*Math.sin(angleAccum);
      pos = [pos[0]+dx, pos[1]+dy];
      this.jointPositions.push(pos.slice());
    }
    return this.jointPositions;
  }

  getEndEffector(){ if(this.jointPositions.length === 0) this.forwardKinematics(); return this.jointPositions[this.jointPositions.length-1]; }

  distanceTo(target){ const e = this.getEndEffector(); return vecLength(sub(target,e)); }

  // CCD algorithm (2D)
  solveIK_CCD(target, {maxIterations=100, tolerance=1e-3, earlyExit=true, damping=1.0} = {}){
    if(!Array.isArray(target) || target.length !== 2) throw new Error('target must be [x,y]');
    // initial fk
    this.forwardKinematics();
    // Support optional per-joint masses which reduce how much a joint moves when a heavy component
    // is attached. To preserve backward compatibility, read jointMasses and massFactor from options
    // if provided.
    const jointMasses = arguments[1] && arguments[1].jointMasses ? arguments[1].jointMasses : (arguments[1] && arguments[1].jointMasses === 0 ? [] : (arguments[1] && arguments[1].jointMasses) );
    // but to be robust, accept jointMasses from the passed-in options object directly
    let jointMassesArr = [];
    if(arguments[1] && Array.isArray(arguments[1].jointMasses)) jointMassesArr = arguments[1].jointMasses;
    const massFactor = arguments[1] && typeof arguments[1].massFactor === 'number' ? arguments[1].massFactor : 0.5;

    for(let iter = 0; iter < maxIterations; iter++){
      // iterate joints from end effector backwards
      for(let i = this.n - 1; i >= 0; i--){
        const jointPos = this.jointPositions[i];
        const endPos = this.getEndEffector();
        const vEff = sub(endPos, jointPos);
        const vT = sub(target, jointPos);
        const ang = angleBetween(vEff, vT);
        // rotate joint i by ang * damping, but scale by mass at joint (heavier => smaller change)
        let mass = 0;
        if(Array.isArray(jointMassesArr) && typeof jointMassesArr[i] === 'number') mass = jointMassesArr[i];
        const scale = 1 / (1 + massFactor * mass);
        this.angles[i] += ang * damping * scale;
        // recompute kinematics for next joint
        this.forwardKinematics();
      }
      const dist = this.distanceTo(target);
      if(earlyExit && dist <= tolerance) return { success: true, iterations: iter+1, distance: dist };
    }
    return { success: false, iterations: maxIterations, distance: this.distanceTo(target) };
  }
}

export { RoboticArm };
