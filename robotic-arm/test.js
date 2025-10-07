import assert from 'assert';
import { RoboticArm } from './index.js';

// Define console fallback only if not present (for very restricted environments)
if (typeof globalThis !== 'undefined' && !globalThis['console']) {
  globalThis['console'] = {
    log: function() {},
    error: function() {},
    warn: function() {},
    info: function() {}
  };
}

const safeConsole = (typeof globalThis !== 'undefined' && globalThis['console']) ? globalThis['console'] : { log: ()=>{}, error: ()=>{}, warn: ()=>{}, info: ()=>{} };

const arm = new RoboticArm([100, 75, 50]);
arm.setAngles([0,0,0]);
const targets = [[120,50],[50,150],[0,200],[200,0]];
for(const t of targets){
  const res = arm.solveIK_CCD(t, { maxIterations: 500, tolerance: 1.0 });
  safeConsole.log(`target ${t} -> success ${res.success} dist=${res.distance.toFixed(3)} iters=${res.iterations}`);
  assert(res.distance <= 1.5, `Failed to reach ${t} within tolerance, dist=${res.distance}`);
}
safeConsole.log('All tests passed');
