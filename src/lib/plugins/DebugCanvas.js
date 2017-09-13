import { World, System } from '../Core';

const DebugCanvasSystem = System({
  configure: config => ({ debug: false, ...config }),

  start (/* world, config, runtime */) {
  },

  stop (/* world, config, runtime */) {
  },

  drawStart (/* world, config, runtime, timeDelta */) {
  },

  draw (/* world, config, runtime, timeDelta */) {
  },

  drawEnd (/* world, config, runtime, timeDelta */) {
  },
});

export const components = { };
export const systems = { DebugCanvas: DebugCanvasSystem };
