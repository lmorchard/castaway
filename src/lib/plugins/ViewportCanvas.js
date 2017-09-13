const { World, System, Component } = require('../Core');

const PI2 = Math.PI * 2;

const CanvasSprite = Component({
  defaults: () => ({
    name: 'default',
    color: '#fff',
    size: 100
  }),
  create (attrs) {
    const c = { ...this.defaults(), ...attrs };
    if (!c.width) { c.width = c.size; }
    if (!c.height) { c.height = c.size; }
    return c;
  }
});

let width, height, sprites, entityId, x, y;

const ViewportCanvasSystem = System({
  configure: config => ({
    container: '#game',
    lineWidth: 1.5,
    zoom: 1.0,
    cameraX: 0,
    cameraY: 0,
    gridEnabled: true,
    gridSize: 250,
    gridColor: '#202020',
    followEntityId: null,
    ...config
  }),

  start (world, config, r) {
    r.container = document.querySelector(config.container);
    r.canvas = document.createElement('canvas');
    r.ctx = r.canvas.getContext('2d');
    r.container.appendChild(r.canvas);

    r.updateMetrics = () => this.updateMetrics(world, config, r);
    r.updateMetrics();

    r.events = {
      'resize': r.updateMetrics,
      'orientationchange': r.updateMetrics
    };
    for (const name in r.events) {
      window.addEventListener(name, r.events[name], false);
    }
  },

  stop (world, config, r) {
    for (const name in r.events) {
      window.removeEventListener(name, r.events[name]);
    }
    try { r.container.removeChild(r.canvas); }
    catch (e) { console.error(e); } // eslint-disable-line no-console
  },

  draw (world, config, r, timeDelta) {
    r.ctx.save();
    this.updateMetrics(world, config, r);
    this.clear(world, config, r, r.ctx);
    this.centerAndZoom(world, config, r, r.ctx);
    this.followEntity(world, config, r, r.ctx);
    if (config.gridEnabled) {
      this.drawBackdrop(world, config, r, r.ctx);
    }
    this.drawScene(world, config, r, r.ctx, timeDelta);
    r.ctx.restore();
  },

  updateMetrics (world, config, r) {
    width = r.container.offsetWidth;
    height = r.container.offsetHeight;

    if (r.canvas.width !== width) { r.canvas.width = width; }
    if (r.canvas.height !== height) { r.canvas.height = height; }

    r.visibleWidth = width / config.zoom;
    r.visibleHeight = height / config.zoom;

    r.visibleLeft = (0 - r.visibleWidth / 2) + config.cameraX;
    r.visibleTop = (0 - r.visibleHeight / 2) + config.cameraY;
    r.visibleRight = r.visibleLeft + r.visibleWidth;
    r.visibleBottom = r.visibleTop + r.visibleHeight;
  },

  clear (world, config, r, ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(0, 0, r.canvas.width, r.canvas.height);
  },

  centerAndZoom (world, config, r, ctx) {
    ctx.translate(r.canvas.width / 2, r.canvas.height / 2);
    ctx.scale(config.zoom, config.zoom);
  },

  followEntity (world, config, r, ctx) {
    if (!config.followEntityId) {
      config.cameraX = config.cameraY = 0;
      return;
    }
    const position = World.get(world, 'Position', config.followEntityId);
    if (position) {
      config.cameraX = position.x;
      config.cameraY = position.y;
      ctx.translate(0 - r.cameraX, 0 - r.cameraY);
    }
  },

  drawBackdrop (world, config, r, ctx) {
    const gridSize = config.gridSize;
    const gridOffsetX = r.visibleLeft % gridSize;
    const gridOffsetY = r.visibleTop % gridSize;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = config.gridColor;
    ctx.lineWidth = config.lineWidth / config.zoom;
    for (x = (r.visibleLeft - gridOffsetX); x < r.visibleRight; x += gridSize) {
      ctx.moveTo(x, r.visibleTop);
      ctx.lineTo(x, r.visibleBottom);
    }
    for (y = (r.visibleTop - gridOffsetY); y < r.visibleBottom; y += gridSize) {
      ctx.moveTo(r.visibleLeft, y);
      ctx.lineTo(r.visibleRight, y);
    }
    ctx.stroke();
    ctx.restore();
  },

  drawScene (world, config, runtime, ctx, timeDelta) {
    sprites = World.get(world, 'CanvasSprite');
    for (entityId in sprites) {
      this.drawSprite(world, config, runtime, ctx, timeDelta,
                      entityId, sprites[entityId]);
    }
  },

  drawSprite(world, config, runtime, ctx, timeDelta, entityId, sprite) {
    const position = World.get(world, 'Position', entityId);
    if (!position) { return; }

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(position.rotation + Math.PI/2);
    ctx.scale(sprite.size / 100, sprite.size / 100);
    // HACK: Try to keep line width consistent regardless of zoom, to sort of
    // simulate a vector display
    ctx.lineWidth = config.lineWidth / config.zoom / (sprite.size / 100);
    ctx.strokeStyle = sprite.color;
    try {
      getSprite(sprite.name)(ctx, timeDelta, sprite, entityId, world);
    } catch (e) {
      getSprite('default')(ctx, timeDelta, sprite, entityId, world);
      // eslint-disable-next-line no-console
      Math.random() < 0.01 && console.error('sprite draw error', e);
    }
    ctx.restore();
  }
});

const spriteRegistry = {
  default (ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, PI2, true);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -50);
    ctx.moveTo(0, 0);
    ctx.stroke();
  }
};

export const getSprite = name =>
  spriteRegistry[name] || spriteRegistry.default;

let spriteModulesContext;
function updateSpriteModules () {
  spriteModulesContext = require.context('./CanvasSprites', false, /\.js$/);
  spriteModulesContext.keys().forEach(key => Object.assign(
    spriteRegistry,
    spriteModulesContext(key).sprites
  ));
}
updateSpriteModules();

if (module.hot) {
  module.hot.accept(spriteModulesContext.id, () => {
    try { updateSpriteModules(); }
    catch (e) {
      // eslint-disable-next-line no-console
      console.log('sprite reload', e);
    }
  });
}

export const components = { CanvasSprite: CanvasSprite };
export const systems = { ViewportCanvas: ViewportCanvasSystem };
