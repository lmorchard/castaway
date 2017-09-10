const TARGET_FPS = 60;
const TARGET_DURATION = 1000 / TARGET_FPS;

const requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function (fn) { setTimeout(fn, (1000/60)); };

export const World = {

  initialize (state = {}) {
    return World.reset(
      Object.assign({}, {
        world: {
          debug: false,
          lastEntityId: 0
        },
        systems: [],
        components: {},
        runtime: {
          systems: {},
          components: {}
        }
      }, state)
    );
  },

  reset (state) {
    Object.assign(state.runtime, {
      isRunning: false,
      isPaused: false,
      lastUpdateTime: Date.now(),
      updateAccumulator: 0,
      lastDrawTime: 0
    });
    return state;
  },

  start (state) {
    const { runtime } = state;

    if (runtime.isRunning) { return; }
    World.reset(state);
    runtime.isRunning = true;

    const systems = state.runtime.systems;
    let i, systemState;
    for (i = 0; i < state.systems.length; i++) {
      systemState = state.systems[i];
      systems[systemState.name].start(state, systemState);
    }

    const updateFn = () => {
      World.updateLoop(state);
      if (runtime.isRunning) {
        runtime.updateTimer = setTimeout(updateFn, TARGET_DURATION);
      }
    };
    runtime.updateTimer = setTimeout(updateFn, TARGET_DURATION);

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
  },

  restart (state) {
    World.stop(state);
    World.start(state);
  },

  pause (state) { state.runtime.isPaused = true; },

  resume (state) { state.runtime.isPaused = false; },

  updateLoop (state) {
    const { runtime } = state;
    const timeNow = Date.now();
    const timeDelta = Math.min(
      timeNow - runtime.lastUpdateTime,
      TARGET_DURATION * 5
    );
    runtime.lastUpdateTime = timeNow;
    if (!runtime.isPaused) {
      // Fixed-step game logic loop
      // see: http://gafferongames.com/game-physics/fix-your-timestep/
      runtime.updateAccumulator += timeDelta;
      while (runtime.updateAccumulator > TARGET_DURATION) {
        World.update(state, TARGET_DURATION);
        runtime.updateAccumulator -= TARGET_DURATION;
      }
    }
  },

  update(state, timeDeltaMS) {
    const timeDelta = timeDeltaMS / 1000;
    const systems = state.runtime.systems;
    let i, systemState;
    for (i = 0; i < state.systems.length; i++) {
      systemState = state.systems[i];
      systems[systemState.name]
        .update(state, systemState, timeDelta);
    }
  },

  drawLoop(state, timestamp) {
    const { runtime } = state;
    if (!runtime.lastDrawTime) {
      runtime.lastDrawTime = timestamp;
    }
    const timeDelta = timestamp - runtime.lastDrawTime;
    runtime.lastDrawTime = timestamp;
    if (!runtime.isPaused) {
      World.draw(state, timeDelta);
    }
  },

  draw(state, timeDeltaMS) {
    const timeDelta = timeDeltaMS / 1000;
    const systems = state.runtime.systems;
    let i, systemState;
    for (i = 0; i < state.systems.length; i++) {
      systemState = state.systems[i];
      systems[systemState.name]
        .draw(state, systemState, timeDelta);
    }
  },

  installPlugins (state, plugins) {
    plugins.forEach(module =>
      ['systems', 'components'].forEach(type =>
        Object.keys(module[type] || {}).forEach(name =>
          state.runtime[type][name] = module[type][name]
        )
      )
    );
  },

  addComponent (state, entityId, componentName, componentAttrs = {}) {
    const componentModule = state.runtime.components[componentName];
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

  // TODO: deprecate this alias
  get (...args) { return World.getComponent(...args); },

  getComponent (state, componentName, entityId) {
    if (!state.components[componentName]) {
      return null;
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

export function System (impl) {
  return Object.assign({
    start(/* state, systemState */) {},
    update(/* state, systemState, timeDelta */) {},
    draw(/* state, systemState, timeDelta */) {},
  }, impl);
}

export function Component (impl) {
  return Object.assign({
    defaults() { return {}; },
    create(attrs) {
      return Object.assign(
        this.defaults(),
        (attrs || {})
      );
    }
  }, impl);
}

export default { World, System, Component };
