const { World, System, Component } = require('../core');

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
    r.container.removeChild(r.canvas);
    for (const name in r.events) {
      window.removeEventListener(name, r.events[name]);
    }
  },

  draw (state, systemState, timeDelta) {
    r = state.runtime.viewportCanvas;

    r.ctx.save();
    this.updateMetrics(state, systemState, r);
    this.clear(state, systemState, r);
    this.centerAndZoom(state, systemState, r, timeDelta);
    this.followEntity(state, systemState, r, timeDelta);
    if (systemState.gridEnabled) {
      this.drawBackdrop(state, systemState, r, timeDelta);
    }
    this.drawScene(state, systemState, r, timeDelta);
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

  clear (state, systemState, r) {
    r.ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    r.ctx.fillRect(0, 0, r.canvas.width, r.canvas.height);
  },

  centerAndZoom (state, systemState, r) {
    r.ctx.translate(r.canvas.width / 2, r.canvas.height / 2);
    r.ctx.scale(systemState.zoom, systemState.zoom);
  },

  followEntity (state, systemState, r) {
    if (!systemState.followEntityId) {
      systemState.cameraX = systemState.cameraY = 0;
      return;
    }
    const position = World.get(state, 'Position', systemState.followEntityId);
    if (position) {
      systemState.cameraX = position.x;
      systemState.cameraY = position.y;
      r.ctx.translate(0 - r.cameraX, 0 - r.cameraY);
    }
  },

  drawBackdrop (state, systemState, r) {
    const gridSize = systemState.gridSize;
    const gridOffsetX = r.visibleLeft % gridSize;
    const gridOffsetY = r.visibleTop % gridSize;
    const ctx = r.ctx;
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

  drawScene (state, systemState, runtime, timeDelta) {
    sprites = World.get(state, 'CanvasSprite');
    for (entityId in sprites) {
      this.drawSprite(state, systemState, runtime, timeDelta,
                      entityId, sprites[entityId]);
    }
  },

  drawSprite(state, systemState, runtime, timeDelta, entityId, sprite) {
    const position = World.get(state, 'Position', entityId);
    if (!position) { return; }

    let spriteFn = getSprite(sprite.name);
    if (!spriteFn) { spriteFn = getSprite('default'); }

    const ctx = runtime.ctx;
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(position.rotation + Math.PI/2);
    ctx.scale(sprite.size / 100, sprite.size / 100);
    // HACK: Try to keep line width consistent regardless of zoom, to sort of
    // simulate a vector display
    ctx.lineWidth = systemState.lineWidth / systemState.zoom / (sprite.size / 100);
    ctx.strokeStyle = sprite.color;
    spriteFn(ctx, timeDelta, sprite, entityId, state);
    ctx.restore();
  }
});

const spriteRegistry = {};
export function registerSprite(name, sprite) {
  spriteRegistry[name] = sprite;
}
export function getSprite(name) {
  return spriteRegistry[name];
}

const PI2 = Math.PI * 2;

registerSprite('default', (ctx) => {
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, PI2, true);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -50);
  ctx.moveTo(0, 0);
  ctx.stroke();
});

registerSprite('sun', (ctx) => {
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, PI2, true);
  ctx.stroke();
});

registerSprite('enemyscout', (ctx) => {
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(-45, 50);
  ctx.lineTo(-12.5, 12.5);
  ctx.lineTo(0, 25);
  ctx.lineTo(12.5, 12.5);
  ctx.lineTo(45, 50);
  ctx.lineTo(0, -50);
  ctx.moveTo(0, -50);
  ctx.stroke();
});

registerSprite('hero', (ctx) => {
  ctx.rotate(Math.PI);
  ctx.beginPath();
  ctx.moveTo(-12.5, -50);
  ctx.lineTo(-25, -50);
  ctx.lineTo(-50, 0);
  ctx.arc(0, 0, 50, Math.PI, 0, true);
  ctx.lineTo(25, -50);
  ctx.lineTo(12.5, -50);
  ctx.lineTo(25, 0);
  ctx.arc(0, 0, 25, 0, Math.PI, true);
  ctx.lineTo(-12.5, -50);
  ctx.stroke();
});

registerSprite('asteroid', (ctx, timeDelta, sprite) => {
  let idx;

  if (!sprite.points) {
    const NUM_POINTS = 7 + Math.floor(8 * Math.random());
    const MAX_RADIUS = 50;
    const MIN_RADIUS = 35;
    const ROTATION = PI2 / NUM_POINTS;

    sprite.points = [];
    for (idx = 0; idx < NUM_POINTS; idx++) {
      const rot = idx * ROTATION;
      const dist = (Math.random() * (MAX_RADIUS - MIN_RADIUS)) + MIN_RADIUS;
      sprite.points.push([dist * Math.cos(rot), dist * Math.sin(rot)]);
    }
  }

  ctx.beginPath();
  ctx.moveTo(sprite.points[0][0], sprite.points[0][1]);
  for (idx = 0; idx < sprite.points.length; idx++) {
    ctx.lineTo(sprite.points[idx][0], sprite.points[idx][1]);
  }
  ctx.lineTo(sprite.points[0][0], sprite.points[0][1]);
  ctx.stroke();

});

registerSprite('explosion', (ctx, timeDelta, sprite) => {
  let p, idx;

  if (!sprite.initialized) {

    sprite.initialized = true;

    Object.assign(sprite, {
      ttl: 2.0,
      radius: 100,
      maxParticles: 25,
      maxParticleSize: 4,
      maxVelocity: 300,
      color: '#f00',
      age: 0,
      stop: false,
      ...sprite
    });

    sprite.particles = [];

    for (idx = 0; idx < sprite.maxParticles; idx++) {
      sprite.particles.push({ free: true });
    }

  }

  for (idx = 0; idx < sprite.particles.length; idx++) {
    p = sprite.particles[idx];

    if (!sprite.stop && p.free) {

      p.velocity = sprite.maxVelocity * Math.random();
      p.angle = (Math.PI * 2) * Math.random();
      p.dx = 0 - (p.velocity * Math.sin(p.angle));
      p.dy = p.velocity * Math.cos(p.angle);
      p.distance = p.x = p.y = 0;
      p.maxDistance = sprite.radius * Math.random();
      p.size = sprite.maxParticleSize;
      p.free = false;

    } else if (!p.free) {

      p.x += p.dx * timeDelta;
      p.y += p.dy * timeDelta;

      p.distance += p.velocity * timeDelta;
      if (p.distance >= p.maxDistance) {
        p.distance = p.maxDistance;
        p.free = true;
      }

    }

  }

  sprite.age += timeDelta;

  if (sprite.age >= sprite.ttl) {
    sprite.stop = true;
  }

  const alpha = Math.max(0, 1 - (sprite.age / sprite.ttl));

  ctx.save();
  ctx.strokeStyle = sprite.color;
  ctx.fillStyle = sprite.color;

  for (idx = 0; idx < sprite.particles.length; idx++) {
    p = sprite.particles[idx];
    if (p.free) { continue; }

    ctx.globalAlpha = (1 - (p.distance / p.maxDistance)) * alpha;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineWidth = p.size;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  ctx.restore();

});

export const components = { CanvasSprite: CanvasSprite };
export const systems = { ViewportCanvas: ViewportCanvasSystem };
