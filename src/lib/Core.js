/* TODO
 * - provide runtime objects to systems in core loops
 * - plugins to port
 *   - position (quadtree)
 *   - bounce
 *   - collision
 *   - hordeSpawn
 *   - playerInputSteering
 *   - repulsor
 *   - roadRunner
 *   - seeker
 *   - spawn
 *   - steering
 *   - thruster
 */
const TARGET_FPS = 60;
const TARGET_DURATION = 1000 / TARGET_FPS;
const MAX_UPDATE_CATCHUP_FRAMES = 5;

const UPDATE_METHODS = ['Start', '', 'End'].map(n => `update${n}`);
const DRAW_METHODS = ['Start', '', 'End'].map(n => `draw${n}`);

let i, j, method, systems, systemState, systemRuntime, timeNow, timeDelta;

export const World = {

  create (initialState = {}) {
    return World.reset({
      systems: [],
      components: {},
      lastEntityId: 0,
      runtime: {},
      modules: { systems: {}, components: {} },
      ...initialState
    });
  },

  reset (state) {
    state.runtime = {
      isRunning: false,
      isPaused: false,
      lastUpdateTime: Date.now(),
      updateAccumulator: 0,
      lastDrawTime: 0,
      systems: []
    };
    return state;
  },

  configure (state, config) {
    const systems = state.modules.systems;
    state.systems = config.map(item => {
      item = typeof item === 'string'
        ? { name: item }
        : { name: item[0], ...item[1] };
      return item.name in systems
        ? systems[item.name].configure(item)
        : item;
    });

  },

  start (state) {
    // Bail if we're already running, otherwise reset the runtime
    if (state.runtime.isRunning) { return; }
    World.reset(state);

    const { runtime } = state;
    runtime.isRunning = true;

    // Start up all the systems
    const systems = state.modules.systems;
    let i, systemState;
    for (i = 0; i < state.systems.length; i++) {
      systemState = state.systems[i];
      systemRuntime = state.runtime.systems[i] = {};
      systems[systemState.name].start(state, systemState, systemRuntime);
    }

    // Fire up the update loop timer
    const updateFn = () => {
      World.updateLoop(state);
      if (runtime.isRunning) {
        runtime.updateTimer = setTimeout(updateFn, TARGET_DURATION);
      }
    };
    runtime.updateTimer = setTimeout(updateFn, TARGET_DURATION);

    // Fire up the draw loop animation frames
    const drawFn = (timestamp) => {
      World.drawLoop(state, timestamp);
      if (runtime.isRunning) {
        runtime.drawFrame = requestAnimationFrame(drawFn);
      }
    };
    runtime.drawFrame = requestAnimationFrame(drawFn);
  },

  stop (state) {
    const { runtime } = state;
    runtime.isRunning = false;
    if (runtime.updateTimer) { clearTimeout(runtime.updateTimer); }
    if (runtime.drawFrame) { cancelAnimationFrame(runtime.drawFrame); }

    // Allow all the systems to stop
    const systems = state.modules.systems;
    for (i = 0; i < state.systems.length; i++) {
      systemState = state.systems[i];
      systemRuntime = state.runtime.systems[i];
      systems[systemState.name].stop(state, systemState, systemRuntime);
    }
  },

  restart (state) {
    World.stop(state);
    World.start(state);
  },

  pause (state) { state.runtime.isPaused = true; },

  resume (state) { state.runtime.isPaused = false; },

  updateLoop (state) {
    timeNow = Date.now();
    timeDelta = Math.min(
      timeNow - state.runtime.lastUpdateTime,
      TARGET_DURATION * MAX_UPDATE_CATCHUP_FRAMES
    );
    state.runtime.lastUpdateTime = timeNow;
    if (!state.runtime.isPaused) {
      // Fixed-step game logic loop
      // see: http://gafferongames.com/game-physics/fix-your-timestep/
      state.runtime.updateAccumulator += timeDelta;
      while (state.runtime.updateAccumulator > TARGET_DURATION) {
        World.update(state, TARGET_DURATION);
        state.runtime.updateAccumulator -= TARGET_DURATION;
      }
    }
  },

  drawLoop(state, timestamp) {
    if (!state.runtime.lastDrawTime) {
      state.runtime.lastDrawTime = timestamp;
    }
    timeDelta = timestamp - state.runtime.lastDrawTime;
    state.runtime.lastDrawTime = timestamp;
    if (!state.runtime.isPaused) {
      World.draw(state, timeDelta);
    }
  },

  update(state, timeDeltaMS) {
    timeDelta = timeDeltaMS / 1000;
    systems = state.modules.systems;
    for (j = 0; j < UPDATE_METHODS.length; j++) {
      method = UPDATE_METHODS[j];
      for (i = 0; i < state.systems.length; i++) {
        try {
          systemState = state.systems[i];
          systemRuntime = state.runtime.systems[i];
          systems[systemState.name][method](state, systemState, systemRuntime, timeDelta);
        } catch (e) {
          // eslint-disable-next-line no-console
          Math.random() < 0.01 && console.error('update step', e);
        }
      }
    }
  },

  draw(state, timeDeltaMS) {
    timeDelta = timeDeltaMS / 1000;
    systems = state.modules.systems;
    for (j = 0; j < DRAW_METHODS.length; j++) {
      method = DRAW_METHODS[j];
      for (i = 0; i < state.systems.length; i++) {
        try {
          systemState = state.systems[i];
          systemRuntime = state.runtime.systems[i];
          systems[systemState.name][method](state, systemState, systemRuntime, timeDelta);
        } catch (e) {
          // eslint-disable-next-line no-console
          Math.random() < 0.01 && console.error('draw step', e);
        }
      }
    }
  },

  install (state, plugins) {
    plugins.forEach(module =>
      ['systems', 'components'].forEach(type =>
        Object.keys(module[type] || {}).forEach(name =>
          state.modules[type][name] = module[type][name]
        )
      )
    );
  },

  generateId (state) { return ++(state.lastEntityId); },

  insert (state, ...items) {
    const out = [];
    let idx, item, entityId, componentName, componentAttrs, componentModule, componentData;
    for (idx = 0; item = items[idx]; idx++) {
      entityId = World.generateId(state);
      for (componentName in item) {
        componentAttrs = item[componentName];
        componentModule = state.modules.components[componentName];
        componentData = componentModule.create(componentAttrs);
        if (!state.components[componentName]) {
          state.components[componentName] = {};
        }
        state.components[componentName][entityId] = componentData;
      }
      // if (this.world) this.world.publish(Messages.ENTITY_INSERT, entityId);
      out.push(entityId);
    }
    return out.length > 1 ? out : out[0];
  },

  destroy (state, entityId) {
    let componentName;
    // if (this.world) this.world.publish(Messages.ENTITY_DESTROY, entityId);
    for (componentName in state.components) {
      if (entityId in state.components[componentName]) {
        delete state.components[componentName][entityId];
      }
    }
  },

  get (state, componentName, entityId) {
    if (!state.components[componentName]) {
      return {};
    } else if (!entityId) {
      return state.components[componentName];
    } else {
      return state.components[componentName][entityId];
    }
  }

};

export const System = impl => ({
  configure: config => ({ debug: false, ...config }),
  start(/* state, systemState, systemRuntime */) {},
  stop(/* state, systemState, systemRuntime */) {},
  updateStart(/* state, systemState, systemRuntime, timeDelta */) {},
  update(/* state, systemState, systemRuntime, timeDelta */) {},
  updateEnd(/* state, systemState, systemRuntime, timeDelta */) {},
  drawStart(/* state, systemState, systemRuntime, timeDelta */) {},
  draw(/* state, systemState, systemRuntime, timeDelta */) {},
  drawEnd(/* state, systemState, systemRuntime, timeDelta */) {},
  ...impl
});

export const Component = impl => ({
  defaults() {
    return {};
  },
  create(attrs = {}) {
    return { ...this.defaults(), ...attrs };
  },
  ...impl
});
