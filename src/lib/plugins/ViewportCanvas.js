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

let width, height, runtime;

const ViewportCanvasSystem = System({
  configure: config => ({
    container: '#game',
    lineWidth: 1.5,
    zoom: 1.0,
    zoomMin: 0.1,
    zoomMax: 10.0,
    zoomWheelFactor: 0.025,
    cameraX: 0,
    cameraY: 0,
    gridEnabled: true,
    gridSize: 250,
    gridColor: '#202020',
    followEnabled: false,
    followEntityId: null,
    ...config
  }),

  start (state, systemState) {
    if (state.runtime.viewportCanvas) { return; }

    runtime = state.runtime.viewportCanvas = {};
    runtime.container = document.querySelector(systemState.container);
    runtime.canvas = document.createElement('canvas');
    runtime.ctx = runtime.canvas.getContext('2d');
    runtime.container.appendChild(runtime.canvas);

    runtime.boundUpdateMetrics =
      () => this.updateMetrics(state, systemState, runtime);
    runtime.boundUpdateMetrics();

    runtime.events = {
      'resize': runtime.boundUpdateMetrics,
      'orientationchange': runtime.boundUpdateMetrics
    };
    for (const name in runtime.events) {
      window.addEventListener(name, runtime.events[name], false);
    }
  },

  stop (state) {
    runtime = state.runtime.viewportCanvas;
    runtime.container.removeChild(runtime.canvas);
    for (const name in runtime.events) {
      window.removeEventListener(name, runtime.events[name]);
    }
  },

  draw (state, systemState, timeDelta) {
    const runtime = state.runtime.viewportCanvas;

    runtime.ctx.save();
    /*
    if (runtime.lastZoom !== systemState.zoom) {
      console.log(runtime.lastZoom, systemState.zoom);
      runtime.lastZoom = systemState.zoom;
      this.updateMetrics(state, systemState, runtime);
    }
    */
    // this.updateMetrics(state, systemState, runtime);
    this.clear(state, systemState, runtime);
    this.centerAndZoom(state, systemState, runtime, timeDelta);
    // this.followEntity(state, systemState, runtime, timeDelta);
    if (systemState.gridEnabled) {
      this.drawBackdrop(state, systemState, runtime, timeDelta);
    }
    this.drawScene(state, systemState, runtime, timeDelta);
    runtime.ctx.restore();
  },

  updateMetrics (state, systemState, runtime) {
    width = runtime.container.offsetWidth;
    height = runtime.container.offsetHeight;

    runtime.canvas.width = width;
    runtime.canvas.height = height;

    runtime.visibleWidth = width / systemState.zoom;
    runtime.visibleHeight = height / systemState.zoom;

    runtime.visibleLeft = (0 - runtime.visibleWidth / 2) + systemState.cameraX;
    runtime.visibleTop = (0 - runtime.visibleHeight / 2) + systemState.cameraY;
    runtime.visibleRight = runtime.visibleLeft + runtime.visibleWidth;
    runtime.visibleBottom = runtime.visibleTop + runtime.visibleHeight;
  },

  clear (state, systemState, runtime) {
    runtime.ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    runtime.ctx.fillRect(0, 0, runtime.canvas.width, runtime.canvas.height);
  },

  centerAndZoom (state, systemState, runtime) {
    runtime.ctx.translate(runtime.canvas.width / 2, runtime.canvas.height / 2);
    runtime.ctx.scale(systemState.zoom, systemState.zoom);
  },

  followEntity (state, systemState, runtime) {
    if (!systemState.followEnabled) {
      systemState.cameraX = systemState.cameraY = 0;
      return;
    }
    if (systemState.followEntityId) {
      // Adjust the viewport center offset to the entity position
      const position = World.get(state, 'Position', systemState.followEntityId);
      if (position) {
        systemState.cameraX = position.x;
        systemState.cameraY = position.y;
        // this.setCursor(runtime.cursorRawX, runtime.cursorRawY);
        runtime.ctx.translate(0 - runtime.cameraX, 0 - runtime.cameraY);
      }
    }
  },

  drawBackdrop (state, systemState, runtime/*, timeDelta */) {
    const gridSize = systemState.gridSize;
    const gridOffsetX = runtime.visibleLeft % gridSize;
    const gridOffsetY = runtime.visibleTop % gridSize;

    const ctx = runtime.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = systemState.gridColor;
    ctx.lineWidth = systemState.lineWidth / systemState.zoom;

    for (
      let x = (runtime.visibleLeft - gridOffsetX);
      x < runtime.visibleRight;
      x += gridSize
    ) {
      ctx.moveTo(x, runtime.visibleTop);
      ctx.lineTo(x, runtime.visibleBottom);
    }

    for (
      let y = (runtime.visibleTop - gridOffsetY);
      y < runtime.visibleBottom;
      y += gridSize
    ) {
      ctx.moveTo(runtime.visibleLeft, y);
      ctx.lineTo(runtime.visibleRight, y);
    }

    ctx.stroke();
    ctx.restore();
  },

  drawScene (state, systemState, runtime, timeDelta) {
    const sprites = World.get(state, 'CanvasSprite');
    for (const entityId in sprites) {
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
    ctx.lineWidth = this.lineWidth / this.zoom / (sprite.size / 100);

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

registerSprite('default', (ctx/*, timeDelta, sprite, entityId*/) => {
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, PI2, true);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -50);
  ctx.moveTo(0, 0);
  ctx.stroke();
});

registerSprite('sun', (ctx/*, timeDelta, sprite, entityId*/) => {
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, PI2, true);
  ctx.stroke();
});

registerSprite('enemyscout', (ctx/*, timeDelta, sprite, entityId*/) => {
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

registerSprite('hero', (ctx/*, timeDelta, sprite, entityId*/) => {
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

registerSprite('asteroid', (ctx, timeDelta, sprite/*, entityId*/) => {
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

registerSprite('explosion', (ctx, timeDelta, sprite/*, entityId*/) => {
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
