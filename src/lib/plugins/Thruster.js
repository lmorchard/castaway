import { World, System, Component } from '../Core';
import Vector2D from '../Vector2D';

let entityId, pos, motion;

const Thruster = Component({
  defaults: () => ({
    active: true,
    stop: false,
    useBrakes: true,
    throttle: 1.0,
    deltaV: 0,
    maxV: 0
  })
});

const ThrusterSystem = System({

  start (world, config, runtime) {
    runtime.vInertia = new Vector2D();
    runtime.vThrust = new Vector2D();
    runtime.vBrakes = new Vector2D();
  },

  update (world, config, runtime, timeDelta) {
    const thrusters = World.get(world, 'Thruster');
    for (entityId in thrusters) {
      this.updateComponent(world, config, runtime, timeDelta,
                           entityId, thrusters[entityId]);
    }
  },

  updateComponent(world, config, runtime, timeDelta, entityId, thruster) {
    if (!thruster.active) { return; }

    pos = World.get(world, 'Position', entityId);
    motion = World.get(world, 'Motion', entityId);
    if (!pos || !motion) { return; }

    // Inertia is current motion
    runtime.vInertia.setValues(motion.dx, motion.dy);

    // delta-v available for the current tick
    const tickDeltaV = timeDelta * thruster.deltaV;

    if (!thruster.stop) {
      // Create thrust vector per rotation and add to inertia.
      runtime.vThrust.setValues(tickDeltaV, 0);
      runtime.vThrust.rotate(pos.rotation);
      runtime.vInertia.add(runtime.vThrust);
    }

    if (thruster.useBrakes) {
      // Try to enforce the max_v limit with braking thrust.
      const maxV = thruster.stop ? 0 : (thruster.throttle * thruster.maxV);
      const currV = runtime.vInertia.magnitude();
      const overV = currV - maxV;
      if (overV > 0) {
        // Braking delta-v is max thruster output or remaining overage,
        // whichever is smallest. Braking vector opposes inertia.
        const brakingDv = Math.min(tickDeltaV, overV);
        runtime.vBrakes.setValues(runtime.vInertia.x, runtime.vInertia.y);
        runtime.vBrakes.normalize();
        runtime.vBrakes.multiplyScalar(0-brakingDv);
        runtime.vInertia.add(runtime.vBrakes);
      }
      if (thruster.stop && currV === 0) {
        thruster.active = false;
      }
    }

    // Update inertia. Note that we've been careful only to make changes
    // to inertia within the delta-v of the thruster. Other influences
    // on inertia should be preserved.
    motion.dx = runtime.vInertia.x;
    motion.dy = runtime.vInertia.y;
  }

});

export const components = { Thruster };
export const systems = { Thruster: ThrusterSystem };
