// Define a mock console if not present (for restricted environments)
if (typeof console === 'undefined') {
  globalThis.console = {
    log: function() {},
    error: function() {},
    warn: function() {},
    info: function() {}
  };
}

import { RoboticArm } from './index.js';

const arm = new RoboticArm([100, 75, 50]);
arm.setAngles([0, 0, 0]);
globalThis.console.log('Initial end effector:', arm.getEndEffector());

const targets = [ [120, 50], [50, 150], [0, 200], [200, 0] ];
for(const t of targets){
  globalThis.console.log('\nSolving IK to target:', t);
  const result = arm.solveIK_CCD(t, { maxIterations: 200, tolerance: 0.5 });
  globalThis.console.log('Result:', result);
  globalThis.console.log('Final angles (deg):', arm.angles.map(a => (a*180/Math.PI).toFixed(2)));
  globalThis.console.log('Final end effector:', arm.getEndEffector());
}
