export default function hello() {
  return 'hello world';
}

export const World = {
  initialize(state) { },

  start (state) { },
  stop (state) { },
  pause (state) { },
  resume (state) { },
  reset (state) { },

  tickLoop(state) { },
  tick(state, timeDeltaMS) { },
  drawLoop(state, timestamp) { },
  draw(state, timeDeltaMS) { },

  generateEntityId(state) { },
  insert(state, ...items) { },
  destroy(state, entityId) { },

  addComponent(entityId, componentName, componentAttrs) { },
  removeComponent(entityId, componentName) { },
  hasComponent(entityId, componentName) { },
  get(componentName, entityId) { }
};

export function System (impl) {
  return Object.assign({
    matchComponent() {},
    initialize() {},
    getMatchingComponents() {},
    updateStart(/* timeDelta */) {},
    update(/* timeDelta */) {},
    updateComponent(/* timedelta, entityId, component */) {},
    updateEnd(/* timeDelta */) {},
    drawStart(/* timeDelta */) {},
    draw(/* timeDelta */) {},
    drawEnd(/* timeDelta */) {}
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
