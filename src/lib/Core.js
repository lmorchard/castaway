/* TODO
 * - plugins to port
 *   - playerInputSteering
 *   - steering
 *   - roadRunner
 *   - spawn
 *   - hordeSpawn
 *   - repulsor
 */
const TARGET_FPS = 60;
const TARGET_DURATION = 1000 / TARGET_FPS;
const MAX_UPDATE_CATCHUP_FRAMES = 5;

const UPDATE_METHODS = ['Start', '', 'End'].map(n => `update${n}`);
const DRAW_METHODS = ['Start', '', 'End'].map(n => `draw${n}`);

let idx, item, entityId, method, systems, config, timeNow, timeDelta;

export const World = {

  create (initialWorld = {}) {
    return World.reset({
      lastId: 0,
      components: {},
      configs: [],
      runtime: {},
      modules: { systems: {}, components: {} },
      ...initialWorld
    });
  },

  reset (world) {
    world.runtime = {
      isRunning: false,
      isPaused: false,
      lastUpdateTime: Date.now(),
      updateAccumulator: 0,
      lastDrawTime: 0,
      systems: []
    };
    return world;
  },

  configure (world, config) {
    const systems = world.modules.systems;
    world.configs = config.map(item => {
      item = typeof item === 'string'
        ? { name: item }
        : { name: item[0], ...item[1] };
      return item.name in systems
        ? systems[item.name].configure(item)
        : item;
    });

  },

  start (world) {
    // Bail if we're already running, otherwise reset the runtime
    if (world.runtime.isRunning) { return; }
    World.reset(world);

    const { runtime } = world;
    runtime.isRunning = true;

    // Start up all the systems
    const systems = world.modules.systems;
    let i;
    for (i = 0; i < world.configs.length; i++) {
      world.runtime.systems[i] = {};
      systems[world.configs[i].name].start(
        world,
        world.configs[i],
        world.runtime.systems[i]
      );
    }

    // Fire up the update loop timer
    const updateFn = () => {
      World.updateLoop(world);
      if (runtime.isRunning) {
        runtime.updateTimer = setTimeout(updateFn, TARGET_DURATION);
      }
    };
    runtime.updateTimer = setTimeout(updateFn, TARGET_DURATION);

    // Fire up the draw loop animation frames
    const drawFn = (timestamp) => {
      World.drawLoop(world, timestamp);
      if (runtime.isRunning) {
        runtime.drawFrame = requestAnimationFrame(drawFn);
      }
    };
    runtime.drawFrame = requestAnimationFrame(drawFn);
  },

  stop (world) {
    const { runtime } = world;
    runtime.isRunning = false;
    if (runtime.updateTimer) { clearTimeout(runtime.updateTimer); }
    if (runtime.drawFrame) { cancelAnimationFrame(runtime.drawFrame); }

    // Allow all the systems to stop
    const systems = world.modules.systems;
    let i;
    for (i = 0; i < world.configs.length; i++) {
      systems[world.configs[i].name].stop(
        world,
        world.configs[i],
        world.runtime.systems[i]
      );
    }
  },

  restart (world) {
    World.stop(world);
    World.start(world);
  },

  pause (world) {
    world.runtime.isPaused = true;
  },

  resume (world) {
    world.runtime.isPaused = false;
  },

  updateLoop (world) {
    timeNow = Date.now();
    timeDelta = Math.min(
      timeNow - world.runtime.lastUpdateTime,
      TARGET_DURATION * MAX_UPDATE_CATCHUP_FRAMES
    );
    world.runtime.lastUpdateTime = timeNow;
    if (!world.runtime.isPaused) {
      // Fixed-step game logic loop
      // see: http://gafferongames.com/game-physics/fix-your-timestep/
      world.runtime.updateAccumulator += timeDelta;
      while (world.runtime.updateAccumulator > TARGET_DURATION) {
        World.update(world, TARGET_DURATION);
        world.runtime.updateAccumulator -= TARGET_DURATION;
      }
    }
  },

  drawLoop (world, timestamp) {
    if (!world.runtime.lastDrawTime) {
      world.runtime.lastDrawTime = timestamp;
    }
    timeDelta = timestamp - world.runtime.lastDrawTime;
    world.runtime.lastDrawTime = timestamp;
    if (!world.runtime.isPaused) {
      World.draw(world, timeDelta);
    }
  },

  update (world, timeDeltaMS) {
    timeDelta = timeDeltaMS / 1000;
    systems = world.modules.systems;
    let i, j;
    for (j = 0; j < UPDATE_METHODS.length; j++) {
      method = UPDATE_METHODS[j];
      for (i = 0; i < world.configs.length; i++) {
        try {
          systems[world.configs[i].name][method](
            world,
            world.configs[i],
            world.runtime.systems[i],
            timeDelta
          );
        } catch (e) {
          this.stop(world);
          throw e;
        }
      }
    }
  },

  draw (world, timeDeltaMS) {
    timeDelta = timeDeltaMS / 1000;
    systems = world.modules.systems;
    let i, j;
    for (j = 0; j < DRAW_METHODS.length; j++) {
      method = DRAW_METHODS[j];
      for (i = 0; i < world.configs.length; i++) {
        try {
          systems[world.configs[i].name][method](
            world,
            world.configs[i],
            world.runtime.systems[i],
            timeDelta
          );
        } catch (e) {
          this.stop(world);
          throw e;
        }
      }
    }
  },

  callSystem (world, systemName, fnName, ...args) {
    for (let i = 0; i < world.configs.length; i++) {
      config = world.configs[i];
      if (config.name !== systemName) { continue; }
      return world.modules.systems[config.name][fnName](
        world, config, world.runtime.systems[i], ...args
      );
    }
  },

  install (world, plugins) {
    plugins.forEach(module =>
      ['systems', 'components'].forEach(type =>
        Object.keys(module[type] || {}).forEach(name =>
          world.modules[type][name] = module[type][name]
        )
      )
    );
  },

  generateId (world) {
    return ++(world.lastId);
  },

  insert (world, ...items) {
    const out = [];
    let name, module;
    for (idx = 0; item = items[idx]; idx++) {
      entityId = World.generateId(world);
      for (name in item) {
        if (!world.components[name]) { world.components[name] = {}; }
        module = world.modules.components[name];
        world.components[name][entityId] = module.create(item[name]);
      }
      // if (this.world) this.world.publish(Messages.ENTITY_INSERT, entityId);
      out.push(entityId);
    }
    return out.length > 1 ? out : out[0];
  },

  destroy (world, entityId) {
    let name;
    // if (this.world) this.world.publish(Messages.ENTITY_DESTROY, entityId);
    for (name in world.components) {
      if (entityId in world.components[name]) {
        delete world.components[name][entityId];
      }
    }
  },

  get (world, name, entityId) {
    if (!world.components[name]) {
      return {};
    } else if (!entityId) {
      return world.components[name];
    } else {
      return world.components[name][entityId];
    }
  },

};

export const System = impl => ({
  configure: config => ({ debug: false, ...config }),
  start (/* world, config, runtime */) {},
  stop (/* world, config, runtime */) {},
  updateStart (/* world, config, runtime, timeDelta */) {},
  update (/* world, config, runtime, timeDelta */) {},
  updateEnd (/* world, config, runtime, timeDelta */) {},
  drawStart (/* world, config, runtime, timeDelta */) {},
  draw (/* world, config, runtime, timeDelta */) {},
  drawEnd (/* world, config, runtime, timeDelta */) {},
  ...impl
});

export const Component = impl => ({
  defaults () {
    return {};
  },
  create (attrs = {}) {
    return { ...this.defaults(), ...attrs };
  },
  ...impl
});
