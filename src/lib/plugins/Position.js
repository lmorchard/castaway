const { System, Component } = require('../Core');

/* TODO:
 * - incorporate quadtree indexing
 */

const Position = Component({
  defaults: () => ({
    x: 0,
    y: 0,
    rotation: 0
  })
});

const PositionSystem = System({
  configure: config => ({
    debug: false,
    ...config
  }),
  /*
  start (state, systemState) {
  },
  update (state, systemState, timeDelta) {
  },
  draw (state, systemState, timeDelta) {
  }
  */
});

export const components = { Position };
export const systems = { Position: PositionSystem };
