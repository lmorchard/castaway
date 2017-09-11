const PI2 = Math.PI * 2;

export const sprites = {

  sun (ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, PI2, true);
    ctx.stroke();
  },

  enemyscout (ctx) {
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
  },

  hero (ctx) {
    const alternate = true;

    ctx.beginPath();
    ctx.moveTo(-12.5, -50);
    ctx.lineTo(-25, -50);
    ctx.lineTo(-50, 0);

    if (alternate) {
      ctx.lineTo(-30, 40);
      ctx.lineTo(0, 50);
      ctx.lineTo(30, 40);
      ctx.lineTo(50, 0);
    } else {
      ctx.arc(0, 0, 50, Math.PI, 0, true);
    }

    ctx.lineTo(25, -50);
    ctx.lineTo(12.5, -50);
    ctx.lineTo(25, 0);
    if (alternate) {
      ctx.lineTo(12.5, -25);
      ctx.lineTo(-12.5, -25);
      ctx.lineTo(-25, 0);
    } else {
      ctx.arc(0, 0, 25, 0, Math.PI, true);
    }
    ctx.lineTo(-12.5, -50);
    ctx.stroke();
  },

  asteroid (ctx, timeDelta, sprite) {
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

  },

  explosion (ctx, timeDelta, sprite) {
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

  }
};
