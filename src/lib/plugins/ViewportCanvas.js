const { World, System, Component } = require('../core');

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

let width, height, sprites, entityId, r, x, y;

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

  start (state, systemState) {
    if (state.runtime.viewportCanvas) { return; }

    r = state.runtime.viewportCanvas = {
      container: document.querySelector(systemState.container),
      canvas: document.createElement('canvas')
    };
    r.ctx = r.canvas.getContext('2d');
    r.container.appendChild(r.canvas);

    r.updateMetrics = () => this.updateMetrics(state, systemState, r);
    r.updateMetrics();

    r.events = {
      'resize': r.updateMetrics,
      'orientationchange': r.updateMetrics
    };
    for (const name in r.events) {
      window.addEventListener(name, r.events[name], false);
    }
  },

  stop (state) {
    r = state.runtime.viewportCanvas;
    for (const name in r.events) {
      window.removeEventListener(name, r.events[name]);
    }
    try { r.container.removeChild(r.canvas); }
    catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  },

  draw (state, systemState, timeDelta) {
    r = state.runtime.viewportCanvas;
    r.ctx.save();
    this.updateMetrics(state, systemState, r);
    this.clear(state, systemState, r, r.ctx);
    this.centerAndZoom(state, systemState, r, r.ctx);
    this.followEntity(state, systemState, r, r.ctx);
    if (systemState.gridEnabled) {
      this.drawBackdrop(state, systemState, r, r.ctx);
    }
    this.drawScene(state, systemState, r, r.ctx, timeDelta);
    r.ctx.restore();
  },

  updateMetrics (state, systemState, r) {
    width = r.container.offsetWidth;
    height = r.container.offsetHeight;

    if (r.canvas.width !== width) { r.canvas.width = width; }
    if (r.canvas.height !== height) { r.canvas.height = height; }

    r.visibleWidth = width / systemState.zoom;
    r.visibleHeight = height / systemState.zoom;

    r.visibleLeft = (0 - r.visibleWidth / 2) + systemState.cameraX;
    r.visibleTop = (0 - r.visibleHeight / 2) + systemState.cameraY;
    r.visibleRight = r.visibleLeft + r.visibleWidth;
    r.visibleBottom = r.visibleTop + r.visibleHeight;
  },

  clear (state, systemState, r, ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(0, 0, r.canvas.width, r.canvas.height);
  },

  centerAndZoom (state, systemState, r, ctx) {
    ctx.translate(r.canvas.width / 2, r.canvas.height / 2);
    ctx.scale(systemState.zoom, systemState.zoom);
  },

  followEntity (state, systemState, r, ctx) {
    if (!systemState.followEntityId) {
      systemState.cameraX = systemState.cameraY = 0;
      return;
    }
    const position = World.get(state, 'Position', systemState.followEntityId);
    if (position) {
      systemState.cameraX = position.x;
      systemState.cameraY = position.y;
      ctx.translate(0 - r.cameraX, 0 - r.cameraY);
    }
  },

  drawBackdrop (state, systemState, r, ctx) {
    const gridSize = systemState.gridSize;
    const gridOffsetX = r.visibleLeft % gridSize;
    const gridOffsetY = r.visibleTop % gridSize;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = systemState.gridColor;
    ctx.lineWidth = systemState.lineWidth / systemState.zoom;
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

  drawScene (state, systemState, runtime, ctx, timeDelta) {
    sprites = World.get(state, 'CanvasSprite');
    for (entityId in sprites) {
      this.drawSprite(state, systemState, runtime, ctx, timeDelta,
                      entityId, sprites[entityId]);
    }
  },

  drawSprite(state, systemState, runtime, ctx, timeDelta, entityId, sprite) {
    const position = World.get(state, 'Position', entityId);
    if (!position) { return; }

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(position.rotation + Math.PI/2);
    ctx.scale(sprite.size / 100, sprite.size / 100);
    // HACK: Try to keep line width consistent regardless of zoom, to sort of
    // simulate a vector display
    ctx.lineWidth = systemState.lineWidth / systemState.zoom / (sprite.size / 100);
    ctx.strokeStyle = sprite.color;
    try {
      getSprite(sprite.name)(ctx, timeDelta, sprite, entityId, state);
    } catch (e) {
      getSprite('default')(ctx, timeDelta, sprite, entityId, state);
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
