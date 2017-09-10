const { World, System, Component } = require('../core');

const Counter = Component({
  defaults: () => ({ count: 0, factor: 1 })
});

const PlaySystem = System({

  start (state, systemState) {
    systemState.label = 'count';
  },

  update (state, systemState, timeDelta) {
    const counters = World.get(state, 'Counter');
    for (const entityId in counters) {
      const counter = counters[entityId];
      counter.count += timeDelta * counter.factor;
    }
  },

  draw (state, systemState, timeDelta) {
    const counters = World.get(state, 'Counter');
    for (const entityId in counters) {
      const counter = counters[entityId];
      let el = document.getElementById(counter.id);
      if (!el) {
        el = document.createElement('h1');
        el.id = counter.id;
        document.body.appendChild(el);
      }
      el.innerText = `* ${systemState.label} ${counter.id} = ${Math.floor(counter.count)} ${Math.floor(timeDelta * 10000) / 10}`;
    }
  }

});

export const components = { Counter };
export const systems = { Play: PlaySystem };
