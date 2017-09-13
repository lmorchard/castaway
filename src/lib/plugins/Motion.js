const { World, System, Component } = require('../Core');

const PI2 = Math.PI * 2;

const Motion = Component({
  defaults: () => ({ dx: 0, dy: 0, drotation: 0 })
});

const MotionSystem = System({
  update (world, config, runtime, timeDelta) {
    const motions = World.get(world, 'Motion');
    for (const entityId in motions) {
      const motion = motions[entityId];
      const position = World.get(world, 'Position', entityId);

      position.x += motion.dx * timeDelta;
      position.y += motion.dy * timeDelta;

      // Update the rotation, ensuring a 0..2*Math.PI range.
      position.rotation = (position.rotation + motion.drotation * timeDelta) % PI2;
      if (position.rotation < 0) { position.rotation += PI2; }
    }
  }
});

export const components = { Motion };
export const systems = { Motion: MotionSystem };
