import { World, System, Component } from '../Core';
import Vector2D from '../Vector2D';

const Bounce = Component({
  defaults: () => ({ mass: 1000.0 })
});

const BounceSystem = System({

  start (world, config, runtime) {
    runtime.dn = new Vector2D();
    runtime.dt = new Vector2D();
    runtime.mt = new Vector2D();
    runtime.v1 = new Vector2D();
    runtime.v2 = new Vector2D();
    runtime.v1n = new Vector2D();
    runtime.v1t = new Vector2D();
    runtime.v2n = new Vector2D();
    runtime.v2t = new Vector2D();
  },

  update (world, config, runtime, timeDelta) {
    const bounces = World.get(world, 'Bounce');

    const pairs = {};
    for (const aEntityId in bounces) {
      const aCollidable = World.get(world, 'Collidable', aEntityId);
      for (const bEntityId in aCollidable.inCollisionWith) {
        const pair = [aEntityId, bEntityId];
        pair.sort();
        pairs[pair.join(':')] = pair;
      }
    }

    for (const key in pairs) {
      const aEntityId = pairs[key][0];
      const aBouncer = World.get(world, 'Bounce', aEntityId);
      if (!aBouncer) { continue; }

      const bEntityId = pairs[key][1];
      const bBouncer = World.get(world, 'Bounce', bEntityId);
      if (!bBouncer) { continue; }

      this.resolveElasticCollision(world, config, runtime, timeDelta,
                                   aEntityId, aBouncer, bEntityId, bBouncer);
    }
  },

  // See also:
  // http://en.m.wikipedia.org/wiki/Elastic_collision
  // http://en.m.wikipedia.org/wiki/Dot_product
  // https://github.com/Edifear/volleyball/blob/master/collision.html
  // https://github.com/DominikWidomski/Processing/blob/master/sketch_canvas_red_particles/particles.pde#L47
  resolveElasticCollision(world, config, runtime, timeDelta,
                          aEntityId, aBouncer, bEntityId, bBouncer) {

    const aPosition = World.get(world, 'Position', aEntityId);
    const aSprite = World.get(world, 'Sprite', aEntityId);
    const aMotion = World.get(world, 'Motion', aEntityId);

    const bPosition = World.get(world, 'Position', bEntityId);
    const bSprite = World.get(world, 'Sprite', bEntityId);
    const bMotion = World.get(world, 'Motion', bEntityId);

    // First, back both entities off to try to prevent sticking
    aPosition.x -= aMotion.dx * timeDelta;
    aPosition.y -= aMotion.dy * timeDelta;
    bPosition.x -= bMotion.dx * timeDelta;
    bPosition.y -= bMotion.dy * timeDelta;
    /*
    let radii, dx, dy;
    while (true) {
      aPosition.x -= aMotion.dx * timeDelta;
      aPosition.y -= aMotion.dy * timeDelta;
      bPosition.x -= bMotion.dx * timeDelta;
      bPosition.y -= bMotion.dy * timeDelta;

      radii = (aSprite.size + bSprite.size) / 2;
      dx = aPosition.x - bPosition.x;
      dy = aPosition.y - bPosition.y;
      if (dx*dx + dy*dy > radii*radii) { break; }
    }
    */

    // Vector between entities
    runtime.dn.setValues(
      aPosition.x - bPosition.x,
      aPosition.y - bPosition.y
    );

    // Distance between entities
    const delta = runtime.dn.magnitude();

    // Normal vector of the collision plane
    runtime.dn.normalize();

    // Tangential vector of the collision plane
    runtime.dt.setValues(runtime.dn.y, -runtime.dn.x);

    // HACK: avoid divide by zero
    if (delta === 0) { bPosition.x += 0.01; }

    // Get total mass for entities
    const m1 = aBouncer.mass;
    const m2 = bBouncer.mass;
    const M = m1 + m2;

    // Minimum translation vector to push entities apart
    runtime.mt.setValues(
      runtime.dn.x * (aSprite.width + bSprite.width - delta) * 1.1,
      runtime.dn.y * (aSprite.height + bSprite.height - delta) * 1.1
    );

    // Velocity vectors of entities before collision
    runtime.v1.setValues(
      (aMotion) ? aMotion.dx : 0,
      (aMotion) ? aMotion.dy : 0
    );
    runtime.v2.setValues(
      (bMotion) ? bMotion.dx : 0,
      (bMotion) ? bMotion.dy : 0
    );

    // split the velocity vector of the first entity into a normal
    // and a tangential component in respect of the collision plane
    runtime.v1n.setValues(
      runtime.dn.x * runtime.v1.dot(runtime.dn),
      runtime.dn.y * runtime.v1.dot(runtime.dn)
    );
    runtime.v1t.setValues(
      runtime.dt.x * runtime.v1.dot(runtime.dt),
      runtime.dt.y * runtime.v1.dot(runtime.dt)
    );

    // split the velocity vector of the second entity into a normal
    // and a tangential component in respect of the collision plane
    runtime.v2n.setValues(
      runtime.dn.x * runtime.v2.dot(runtime.dn),
      runtime.dn.y * runtime.v2.dot(runtime.dn)
    );
    runtime.v2t.setValues(
      runtime.dt.x * runtime.v2.dot(runtime.dt),
      runtime.dt.y * runtime.v2.dot(runtime.dt)
    );

    // calculate new velocity vectors of the entities, the tangential
    // component stays the same, the normal component changes analog to
    // the 1-Dimensional case

    // runtime.world.publish(MSG_BOUNCE, { a: aEntityId, b: bEntityId });

    if (aMotion) {
      const aFactor = (m1 - m2) / M * runtime.v1n.magnitude() +
                      2 * m2 / M * runtime.v2n.magnitude();
      aMotion.dx = runtime.v1t.x + runtime.dn.x * aFactor;
      aMotion.dy = runtime.v1t.y + runtime.dn.y * aFactor;
      //this.processDamage(aEntityId, bEntityId, aMotion, aBouncer, m1);
    }

    if (bMotion) {
      const bFactor = (m2 - m1) / M * runtime.v2n.magnitude() +
                      2 * m1 / M * runtime.v1n.magnitude();
      bMotion.dx = runtime.v2t.x - runtime.dn.x * bFactor;
      bMotion.dy = runtime.v2t.y - runtime.dn.y * bFactor;
      //this.processDamage(bEntityId, aEntityId, bMotion, bBouncer, m1);
    }

  }

  /*
  processDamage(eid, c_eid, v_motion, bouncer, m1) {
    if (!bouncer.damage) { return; }

    // Convert a fraction of the rebound velocity into damage by mass
    const dmg = Math.sqrt(v_motion.dx * v_motion.dx + v_motion.dy * v_motion.dy) *
                bouncer.damage * m1;

    this.world.publish(MSG_DAMAGE, {
      to: eid,
      from: c_eid,
      amount: dmg / 2
    });

    this.world.publish(MSG_DAMAGE, {
      to: c_eid,
      from: eid,
      amount: dmg / 2
    });
  }
  */

});

export const components = { Bounce };
export const systems = { Bounce: BounceSystem };
