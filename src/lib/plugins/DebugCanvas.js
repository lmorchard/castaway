import { System } from '../Core';

const DebugCanvasSystem = System({

  configure: config => ({
    debug: false,
    container: '#game',
    debugText: true,
    viewportName: 'ViewportCanvas',
    ...config
  }),

  start (world, config, runtime) {
    runtime.container = document.querySelector(config.container);
    runtime.canvas = document.createElement('canvas');
    runtime.container.appendChild(runtime.canvas);

    Object.assign(runtime.canvas.style, {
      zIndex: -1999,
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0)',
    });

    runtime.ctx = runtime.canvas.getContext('2d');

    const width = runtime.container.offsetWidth;
    const height = runtime.container.offsetHeight;
    runtime.canvas.width = width;
    runtime.canvas.height = height;

    runtime.viewportConfig = {};
    for (let i = 0; i < world.configs.length; i++) {
      const otherConfig = world.configs[i];
      if (otherConfig.name === config.viewportName) {
        runtime.viewportConfig = otherConfig;
      }
    }
  },

  stop (world, config, runtime) {
    try { runtime.container.removeChild(runtime.canvas); }
    catch (e) {
      /* no-op */
    }
  },

  drawStart (world, config, runtime) {
    if (!config.debug) {
      if ('none' !== runtime.canvas.style.display) {
        runtime.canvas.style.display = 'none';
      }
      return;
    }

    if ('block' !== runtime.canvas.style.display) {
      runtime.canvas.style.display = 'block';
    }

    runtime.canvas.width = runtime.container.offsetWidth;
    runtime.canvas.height = runtime.container.offsetHeight;

    runtime.ctx.resetTransform();
    runtime.ctx.clearRect(
      0, 0,
      runtime.canvas.width, runtime.canvas.height
    );
    runtime.ctx.translate(
      runtime.canvas.width / 2,
      runtime.canvas.height / 2
    );
    runtime.ctx.scale(
      runtime.viewportConfig.zoom,
      runtime.viewportConfig.zoom
    );
    runtime.ctx.translate(
      0 - runtime.viewportConfig.cameraX,
      0 - runtime.viewportConfig.cameraY
    );
  },

  draw (world, config, runtime, timeDelta) {
    if (!config.debug) { return; }

    for (let i = 0; i < world.configs.length; i++) {
      const otherConfig = world.configs[i];
      const module = world.modules.systems[otherConfig.name];
      if ('drawDebug' in module) {
        const otherRuntime = world.runtime.systems[i];
        module.drawDebug(world, otherConfig, otherRuntime, timeDelta, runtime.ctx);
      }
    }
  },

  drawEnd (world, config, runtime) {
    if (!config.debug) { return; }
    runtime.ctx.restore();
  }

});

export const components = { };
export const systems = { DebugCanvas: DebugCanvasSystem };
