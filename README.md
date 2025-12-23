# Dolly's Mechanochemical Robotics

This is a 3D simulation of a robotic arm in a mining context and the crystal counterweight that would insert into it. It is bare-bones and meant to support me in writing my value proposition to I-Corps, the NSF, Alaska Space Grant, etc. - more projects will likely follow about my proposition that I create in order to help myself and others visualize.

### Controls
- **Camera:**
  - Left click + drag to rotate view
  - Right click + drag to pan
  - Scroll to zoom in/out
- **Counterweight:**
  - Precise position control using X, Y, Z sliders
  - Real-time position feedback

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/dorothygracelin/Dolly-s-Mechanochemical-Robotics-.git
```

2. Install dependencies:
```bash
cd Dolly-s-Mechanochemical-Robotics-/robotic-arm/ui
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the displayed localhost URL (default: http://localhost:5173)

## Technology Stack
- Three.js for 3D visualization
- WebGL for hardware-accelerated rendering
- Vite for development and building
