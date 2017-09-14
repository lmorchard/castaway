import { World, System, Component } from '../Core';

let entityId, entityId2, collidable, position, aCollidable, bCollidable, dx, dy, radii;

const Collidable = Component({
  defaults: () => ({
    inCollision: false,
    inCollisionWith: {}
  })
});

const CollisionSystem = System({

  configure: config => ({
    debug: false,
    positionSystemName: 'Position',
    ...config
  }),

  start (world, config, runtime) {
    this.checkCollision = this.checkCollision.bind(this);
  },

  update (world, config) {
    const collidables = World.get(world, 'Collidable');
    for (const entityId in collidables) {
      collidable = collidables[entityId];
      collidable.inCollision = false;
      for (const entityId2 in collidable.inCollisionWith) {
        delete collidable.inCollisionWith[entityId2];
      }
    }
    for (const entityId in collidables) {
      position = World.get(world, 'Position', entityId);
      if (position) {
        false && World.callSystem(
          world, config.positionSystemName, 'searchQuadtree',
          position, this.checkCollision, [world, position]
        );
      }
    }
  },

  checkCollision(bPosition, [world, aPosition]) {
    Math.random() < 0.01 && console.log('checkCollision');
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
