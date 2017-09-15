import { World, System, Component } from '../Core';
import QuadTree from '../QuadTree';

let entityId, sprite, position, positions;
const PI2 = Math.PI * 2;

const Position = Component({
  defaults: () => ({ x: 0, y: 0, rotation: 0, size: 100 })
});

const PositionSystem = System({

  configure: config => ({
    debug: false,
    quadtreeObjectsPerNode: 5,
    quadtreeMaxLevels: 5,
    ...config
  }),

  start (world, config, runtime) {
    runtime.bounds = {
      left: 0, top: 0, right: 0, bottom: 0,
      width: 0, height: 0
    };
    runtime.quadtree = new QuadTree(
      -1000, -1000, 2000, 2000,
      config.quadtreeObjectsPerNode,
      config.quadtreeMaxLevels
    );
  },

  update (world, config, runtime/*, timeDelta */) {
    const positions = World.get(world, 'Position');
    let position, entityId;

    // Update quadtree metrics for all positions
    for (entityId in positions) {
      position = positions[entityId];
      const halfWidth = position.size / 2;
      const halfHeight = position.size / 2;

      position.entityId = entityId;
      position.width = position.size;
      position.height = position.size;
      position.left = position.x - halfWidth;
      position.top = position.y - halfHeight;
      position.right = position.x + halfWidth;
      position.bottom = position.y + halfHeight;
    }

    // Figure out bounds containing all positions
    runtime.bounds.left = runtime.bounds.top =
      runtime.bounds.right = runtime.bounds.bottom = 0;
    for (entityId in positions) {
      position = positions[entityId];
      if (position.left < runtime.bounds.left)
        { runtime.bounds.left = position.left; }
      if (position.top < runtime.bounds.top)
        { runtime.bounds.top = position.top; }
      if (position.right > runtime.bounds.right)
        { runtime.bounds.right = position.right; }
      if (position.bottom > runtime.bounds.bottom)
        { runtime.bounds.bottom = position.bottom; }
    }
    runtime.bounds.width = runtime.bounds.right - runtime.bounds.left;
    runtime.bounds.height = runtime.bounds.bottom - runtime.bounds.top;

    // Reset the quadtree
    runtime.quadtree.reset(
      runtime.bounds.left,
      runtime.bounds.top,
      runtime.bounds.width,
      runtime.bounds.height,
      config.quadtreeObjectsPerNode,
      config.quadtreeMaxLevels
    );

    // Index all the positions in the quadtree
    for (entityId in positions) {
      runtime.quadtree.insert(position);
    }
  },

  searchQuadtree (world, config, runtime, ...args) {
    return runtime.quadtree.iterate(...args);
  },

  drawDebug (world, config, runtime, timeDelta, g) {
    if (!config.debug) { return; }

    g.lineWidth = 4;
    g.strokeStyle = g.fillStyle = '#882222';
    positions = World.get(world, 'Position');

    for (entityId in positions) {
      position = positions[entityId];
      g.moveTo(position.x + position.size/2, position.y);
      g.arc(position.x, position.y, position.size / 2, 0, PI2);
      g.moveTo(position.x - 20, position.y);
      g.lineTo(position.x + 20, position.y);
      g.moveTo(position.x, position.y - 20);
      g.lineTo(position.x, position.y + 20);
    }
    g.stroke();

    g.strokeStyle = g.fillStyle = '#228822';
    this.drawDebugQuadtreeNode(g, runtime.quadtree);
    g.stroke();

    g.strokeStyle = g.fillStyle = '#ffff33';
    g.rect(
      runtime.bounds.left,
      runtime.bounds.top,
      runtime.bounds.width,
      runtime.bounds.height
    );
    g.stroke();
  },

  drawDebugQuadtreeNode(g, root) {
    if (!root) { return; }

    g.strokeStyle = g.fillStyle = '#883388';
    g.moveTo(root.bounds.left, root.bounds.top);
    g.rect(root.bounds.left, root.bounds.top, root.bounds.width, root.bounds.height);

    g.strokeStyle = g.fillStyle = '#112222';
    root.objects.forEach(body => {
      g.moveTo(body.left, body.top);
      g.rect(body.left, body.top, body.width, body.height);
    });

    this.drawDebugQuadtreeNode(g, root.nodes[0]);
    this.drawDebugQuadtreeNode(g, root.nodes[1]);
    this.drawDebugQuadtreeNode(g, root.nodes[2]);
    this.drawDebugQuadtreeNode(g, root.nodes[3]);
  }

});

export const components = { Position };
export const systems = { Position: PositionSystem };
