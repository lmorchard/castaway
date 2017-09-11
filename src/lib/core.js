const TARGET_FPS = 60;
const TARGET_DURATION = 1000 / TARGET_FPS;
const MAX_UPDATE_CATCHUP_FRAMES = 5;

const UPDATE_METHODS = ['Start', '', 'End'].map(n => `update${n}`);
const DRAW_METHODS = ['Start', '', 'End'].map(n => `draw${n}`);

let i, j, method, systems, systemState, timeNow, timeDelta;

export const World = {

  initialize (initialState = {}) {
    return World.resetRuntime(
      Object.assign({}, {
        world: {
          debug: false,
          lastEntityId: 0
        },
        systems: [],
        components: {},
        runtime: {},
        modules: {
          systems: {},
          components: {}
        }
      }, initialState)
    );
  },

  resetRuntime (state) {
    state.runtime = {
      isRunning: false,
      isPaused: false,
      lastUpdateTime: Date.now(),
      updateAccumulator: 0,
      lastDrawTime: 0
    };
    return state;
  },

  configureSystems (state, config) {
    const systems = state.modules.systems;
    state.systems = config.map(item => {
      if (typeof item === 'string') {
        item = { name: item };
      } else {
        item = { name: item[0], ...item[1] };
      }
      return item.name in systems
        ? systems[item.name].configure(item)
        : item;
    });

  },

  start (state) {
    // Bail if we're already running, otherwise reset the runtime
    if (state.runtime.isRunning) { return; }
    World.resetRuntime(state);

    const { runtime } = state;
    runtime.isRunning = true;

    // Allow all the systems to start
    const systems = state.modules.systems;
    let i, systemState;
    for (i = 0; i < state.systems.length; i++) {
      systemState = state.systems[i];
      systems[systemState.name].start(state, systemState);
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
    let i, systemState;
    for (i = 0; i < state.systems.length; i++) {
      systemState = state.systems[i];
      systems[systemState.name].stop(state, systemState);
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
          systems[systemState.name][method](state, systemState, timeDelta);
        } catch (e) {
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
          systems[systemState.name][method](state, systemState, timeDelta);
        } catch (e) {
          Math.random() < 0.01 && console.error('draw step', e);
        }
      }
    }
  },

  installPlugins (state, plugins) {
    plugins.forEach(module =>
      ['systems', 'components'].forEach(type =>
        Object.keys(module[type] || {}).forEach(name =>
          state.modules[type][name] = module[type][name]
        )
      )
    );
  },

  addComponent (state, entityId, componentName, componentAttrs = {}) {
    const componentModule = state.modules.components[componentName];
    const componentData = componentModule.create(componentAttrs);
    if (!state.components[componentName]) {
      state.components[componentName] = {};
    }
    state.components[componentName][entityId] = componentData;
  },

  removeComponent (state, entityId, componentName) {
    if (entityId in state.components[componentName]) {
      delete state.components[componentName][entityId];
    }
  },

  hasComponent (state, entityId, componentName) {
    return (componentName in state.components) &&
           (entityId in state.components[componentName]);
  },

  get (state, componentName, entityId) {
    if (!state.components[componentName]) {
      return {};
    } else if (!entityId) {
      return state.components[componentName];
    } else {
      return state.components[componentName][entityId];
    }
  },

  generateEntityId (state) { return ++(state.world.lastEntityId); },

  insert (state, ...items) {
    const out = [];
    let idx, item, entityId, componentName, componentAttrs;
    for (idx = 0; item = items[idx]; idx++) {
      entityId = World.generateEntityId(state);
      for (componentName in item) {
        componentAttrs = item[componentName];
        World.addComponent(state, entityId, componentName, componentAttrs);
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
      World.removeComponent(state, entityId, componentName);
    }
  }

};

export const System = impl => ({
  configure(config) { return config; },
  start(/* state, systemState */) {},
  stop(/* state, systemState */) {},
  updateStart(/* state, systemState, timeDelta */) {},
  update(/* state, systemState, timeDelta */) {},
  updateEnd(/* state, systemState, timeDelta */) {},
  drawStart(/* state, systemState, timeDelta */) {},
  draw(/* state, systemState, timeDelta */) {},
  drawEnd(/* state, systemState, timeDelta */) {},
  ...impl
});

export const Component = impl => ({
  defaults() {
    return {};
  },
  create(attrs = {}) {
    return {
      ...this.defaults(),
      ...attrs
    };
  },
  ...impl
});

export default { World, System, Component };
