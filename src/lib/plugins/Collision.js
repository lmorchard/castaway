import { World, System, Component } from '../Core';

let entityId, entityId2, collidable, position, aCollidable, bCollidable, dx, dy, radii;

const Collidable = Component({
  defaults: () => ({
    inCollision: false,
    inCollisionWith: {}
  })
});

const CollisionSystem = System({

  configure (config) {
    this.checkCollision = this.checkCollision.bind(this);
    return {
      debug: false,
      positionSystemName: 'Position',
      ...config
    };
  },

  update (world, config) {
    const collidables = World.get(world, 'Collidable');
    for (entityId in collidables) {
      collidable = collidables[entityId];
      collidable.inCollision = false;
      for (entityId2 in collidable.inCollisionWith) {
        delete collidable.inCollisionWith[entityId2];
      }
    }
    for (const entityId in collidables) {
      position = World.get(world, 'Position', entityId);
      if (position) {
        World.callSystem(
          world, config.positionSystemName, 'searchQuadtree',
          position, this.checkCollision, [world, position]
        );
      }
    }
  },

  checkCollision(bPosition, [world, aPosition]) {
    if (aPosition.entityId === bPosition.entityId) { return; }

    aCollidable = World.get(world, 'Collidable', aPosition.entityId);
    bCollidable = World.get(world, 'Collidable', bPosition.entityId);

    if (!aCollidable || !bCollidable) { return; }

    dx = aPosition.x - bPosition.x;
    dy = aPosition.y - bPosition.y;

    // TODO: Pluggable shape intersection detection here?

    // Check collision circle via distance
    radii = (aPosition.width + bPosition.width) / 2;
    if (dx*dx + dy*dy > radii*radii) { return; }

    aCollidable.inCollision = true;
    aCollidable.inCollisionWith[bPosition.entityId] = 1;

    bCollidable.inCollision = true;
    bCollidable.inCollisionWith[aPosition.entityId] = 1;
  }
});

export const components = { Collidable };
export const systems = { Collision: CollisionSystem };
