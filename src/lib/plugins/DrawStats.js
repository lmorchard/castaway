import { System } from '../Core';
import Stats from 'stats-js';

const DrawStats = System({
  configure: config => ({ draw: true, update: true, ...config }),

  start (world, config, runtime) {
    if (config.draw && !runtime.drawStats) {
      runtime.drawStats = new Stats();
      runtime.drawStats.setMode(0);
      Object.assign(runtime.drawStats.domElement.style,
        { position: 'absolute', left: '90px', top: '0px' });
      document.body.appendChild(runtime.drawStats.domElement);
    }
    if (config.update && !runtime.updateStats) {
      runtime.updateStats = new Stats();
      runtime.updateStats.setMode(0);
      Object.assign(runtime.updateStats.domElement.style,
        { position: 'absolute', left: '0px', top: '0px' });
      document.body.appendChild(runtime.updateStats.domElement);
    }
  },

  stop (world, config, runtime) {
    if (config.draw) {
      try { document.body.removeChild(runtime.drawStats.domElement); }
      catch (e) { console.error(e); } // eslint-disable-line no-console
    }
    if (config.update) {
      try { document.body.removeChild(runtime.updateStats.domElement); }
      catch (e) { console.error(e); } // eslint-disable-line no-console
    }
  },

  updateStart(world, config, runtime) {
    config.update && runtime.updateStats.begin();
  },
  updateEnd(world, config, runtime) {
    config.update && runtime.updateStats.end();
  },
  drawStart(world, config, runtime) {
    config.draw && runtime.drawStats.begin();
  },
  drawEnd(world, config, runtime) {
    config.draw && runtime.drawStats.end();
  }
});

export const components = { };
export const systems = { DrawStats };
