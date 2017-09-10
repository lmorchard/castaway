import './index.css';

let { World } = require('./lib/core');

const state = World.initialize();

let plugins;
function updatePlugins() {
  plugins = require.context('./lib/plugins', true, /\.js$/);
  World.installPlugins(state, plugins.keys().map(key => plugins(key)));
}
updatePlugins();

World.configureSystems(state, [
  { name: 'Play' }
]);

World.insert(state,
  { Counter: { id: 'a1', count: 0 } },
  { Counter: { id: 'a2', count: 10, factor: 5 } },
  { Counter: { id: 'a3', count: 100, factor: 10 } },
  { Counter: { id: 'a4', count: 1000, factor: 25 } }
);

World.start(state);

if (module.hot) {
  module.hot.accept(plugins.id, updatePlugins);
  module.hot.accept('./lib/core', () => {
    ({ World } = require('./lib/core'));
    World.restart(state);
  });
}
