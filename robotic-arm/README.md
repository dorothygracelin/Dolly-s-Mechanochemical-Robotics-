
![Banner](ui/assets/banner.svg)

```markdown
# Robotic Arm Simulation (3D) — Demo & UI

This folder contains a 3D robotic-arm kinematics and inverse-kinematics (IK) demo built for experimentation and visualization of my value proposition to the NSF about the mixed-metal crystal component I would like to design for insertion into mining robotics. More projects will likely follow expounding upon the value proposition and more detailed visuals. The project is intentionally small and designed to be extended in the future. For now it will help you envision the type of robotics I'm talking about and on what scale.

Highlights
- Small, dependency-free core IK implementation in JavaScript using the CCD (Cyclic Coordinate Descent) algorithm.
- A simple command-line demo and test harness.
- A lightweight browser UI that visualizes the arm on a Canvas and supports inserting and removing the crystal core composite as needed.

Files
- `index.js` — core `RoboticArm` class: forward kinematics and CCD-based IK solver. The solver accepts an optional `jointMasses` array to simulate heavier attachments (counterweights) reducing joint movement.
- `demo.js` — example script that runs several target solves and prints the results.
- `test.js` — small, runnable test that asserts the IK solver reaches example targets.
- `ui/` — browser UI (Canvas + optional three.js preview) with files:
	- `index.html` — UI page
	- `main.js` — UI logic (ES module) that imports `../index.js`
	- `style.css` — UI styles
	- `assets/` — bundled assets (example `counterweight.obj` is included)

Quick start (command line)

From repository root, run the demo or tests:

```bash
# Run the demo (prints example solves)
node simulations/robotic-arm/demo.js

# Run the tests
node simulations/robotic-arm/test.js
```

Open the UI (browser)

The UI imports `../index.js` as an ES module; it must be served over HTTP (not opened via `file://`). From the project folder you can run a simple static server, for example:

```bash
cd simulations/robotic-arm/ui
python3 -m http.server 8001
# then open http://localhost:8001 in your browser
```

Included asset
- `ui/assets/counterweight.obj` — a small example 3D model (box) used by the demo UI as a built-in asset.

Extending the project
- Create a richer 3D visualization (embed three.js into the main canvas or use WebGL for the full scene).

Safety, ethics, and scope

This repository contains simulation and visualization code only. You may notice imagery or project notes that reference mining, counterweights, or materials processing. The repository does not contain operational instructions, recipes, or procedural guidance for processing hazardous materials (including uranium or radioactive sources). The included robotic simulation and 3D assets are intended solely for benign simulation, visualization, and educational purposes. This simulation is bare-bones and meant to support me in my value proposition to I-Corps, the NSF, Alaska Space Grant, etc.

License & attribution
- This folder follows the repository license (see root `LICENSE`). The demo and UI are small, illustrative examples — feel free to adapt them for non-harmful use-cases. If you add or include third-party assets, ensure you have the appropriate rights and include attribution.

Contact / next steps
- If you want, I can:
	- Add OrbitControls and a more realistic PBR environment to the preview (this repo already supports dynamic three.js previewing).
	- Convert the UI into a bundled app (Vite) and add a local three.js dependency for offline use.
	- Add per-component offsets/inertia so attached counterweights affect dynamics more realistically.

```
