Robotic Arm UI

Open `ui/index.html` in a browser (prefer serving the folder with a static server).

Quick start (from repository root):

```bash
# from repo root
cd simulations/robotic-arm/ui
# start a simple Python HTTP server on port 8001
python3 -m http.server 8001

# then open http://localhost:8001 in your browser
```

The UI imports the module `../index.js` and uses the CCD IK solver. You can drag the canvas to move the target, toggle auto-solve, and attach a simple electronic component (Camera, Gripper, Sensor) to any joint to visualize insertion.
