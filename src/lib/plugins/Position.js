const { System, Component } = require('../Core');

const Position = Component({
  defaults: () => ({ x: 0, y: 0, rotation: 0 })
});

const PositionSystem = System({ });

export const components = { Position };
export const systems = { Position: PositionSystem };
