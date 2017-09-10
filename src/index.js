import './index.css';

const { World } = require('./lib/core');

const state = World.initialize({
  systems: [
    { name: 'Play' }
  ]
});

World.installPlugins(state, [
  require('./lib/plugins/Play')
]);

World.insert(state,
  { Counter: { id: 'a1', count: 0 } },
  { Counter: { id: 'a2', count: 10, factor: 5 } },
  { Counter: { id: 'a3', count: 100, factor: 10 } }
);

World.start(state);

if (module.hot) {

  module.hot.accept('./lib/core', () =>
    require('./lib/core').World.restart(state));

  module.hot.accept('./lib/plugins/Play', () =>
    World.installPlugins(state, [
      require('./lib/plugins/Play')
    ]));

}
