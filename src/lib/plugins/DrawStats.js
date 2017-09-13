import { System } from '../Core';
import Stats from 'stats-js';

const DrawStats = System({
  configure: config => ({ draw: true, update: true, ...config }),

  start (state, systemState, systemRuntime) {
    if (systemState.draw && !systemRuntime.drawStats) {
      systemRuntime.drawStats = new Stats();
      systemRuntime.drawStats.setMode(0);
      Object.assign(systemRuntime.drawStats.domElement.style,
        { position: 'absolute', left: '90px', top: '0px' });
      document.body.appendChild(systemRuntime.drawStats.domElement);
    }
    if (systemState.update && !systemRuntime.updateStats) {
      systemRuntime.updateStats = new Stats();
      systemRuntime.updateStats.setMode(0);
      Object.assign(systemRuntime.updateStats.domElement.style,
        { position: 'absolute', left: '0px', top: '0px' });
      document.body.appendChild(systemRuntime.updateStats.domElement);
    }
  },

  stop (state, systemState, systemRuntime) {
    if (systemState.draw) {
      try { document.body.removeChild(systemRuntime.drawStats.domElement); }
      catch (e) { console.error(e); } // eslint-disable-line no-console
    }
    if (systemState.update) {
      try { document.body.removeChild(systemRuntime.updateStats.domElement); }
      catch (e) { console.error(e); } // eslint-disable-line no-console
    }
  },

  updateStart(state, systemState, systemRuntime) {
    systemState.update && systemRuntime.updateStats.begin();
  },
  updateEnd(state, systemState, systemRuntime) {
    systemState.update && systemRuntime.updateStats.end();
  },
  drawStart(state, systemState, systemRuntime) {
    systemState.draw && systemRuntime.drawStats.begin();
  },
  drawEnd(state, systemState, systemRuntime) {
    systemState.draw && systemRuntime.drawStats.end();
  }
});

export const components = { };
export const systems = { DrawStats };
