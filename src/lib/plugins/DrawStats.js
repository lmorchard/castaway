const { System } = require('../Core');

import Stats from 'stats-js';

const DrawStats = System({
  configure: config => ({
    draw: true,
    update: true,
    ...config
  }),

  start (state, systemState) {
    if (state.runtime.drawStats) { return; }
    let drawStats, updateStats;

    if (systemState.draw) {
      drawStats = new Stats();
      drawStats.setMode(0);
      Object.assign(drawStats.domElement.style, {
        position: 'absolute', left: '90px', top: '0px'
      });
      document.body.appendChild(drawStats.domElement);
    }

    if (systemState.update) {
      updateStats = new Stats();
      updateStats.setMode(0);
      Object.assign(updateStats.domElement.style, {
        position: 'absolute', left: '0px', top: '0px'
      });
      document.body.appendChild(updateStats.domElement);
    }

    state.runtime.drawStats = { drawStats, updateStats };
  },

  stop (state, systemState) {
    const runtime = state.runtime.drawStats;
    if (systemState.draw) {
      try { document.body.removeChild(runtime.drawStats.domElement); }
      catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
    if (systemState.update) {
      try { document.body.removeChild(runtime.updateStats.domElement); }
      catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  },

  updateStart(state, systemState) {
    systemState.update && state.runtime.drawStats.updateStats.begin();
  },
  updateEnd(state, systemState) {
    systemState.update && state.runtime.drawStats.updateStats.end();
  },
  drawStart(state, systemState) {
    systemState.draw && state.runtime.drawStats.drawStats.begin();
  },
  drawEnd(state, systemState) {
    systemState.draw && state.runtime.drawStats.drawStats.end();
  }
});

export const components = { };
export const systems = { DrawStats };
