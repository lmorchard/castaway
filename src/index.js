import './index.css';

import dat from 'dat-gui';

let { World } = require('./lib/Core');

const state = window.state = World.initialize();
state.world.debug = true;

let plugins;
function updatePlugins() {
  plugins = require.context('./lib/plugins', false, /\.js$/);
  World.installPlugins(state, plugins.keys().map(key => plugins(key)));
}
updatePlugins();

World.configureSystems(state, [
  [ 'ViewportCanvas', { debug: true } ],
  'DrawStats',
  'Position',
  'Motion'
]);

World.insert(state,
  { Name: { name: 'a1' },
    CanvasSprite: { name: 'hero' },
    Position: {},
    Motion: { dx: 0, dy: 0, drotation: Math.PI / 2 } },
  { Name: { name: 'a2' },
    CanvasSprite: { name: 'asteroid' },
    Position: { x: 200, y: 0 },
    Motion: { dx: 0, dy: 0, drotation: -Math.PI / 3 } },
  { Name: { name: 'a3' },
    CanvasSprite: { name: 'enemyscout' },
    Position: { x: -200, y: 0 },
    Motion: { dx: 0, dy: 0, drotation: -Math.PI } }
);

World.start(state);

const gui = new dat.GUI();

const worldFolder = gui.addFolder('World');
worldFolder.add(state.runtime, 'isPaused');
worldFolder.add(state.world, 'debug');
worldFolder.open();

const vpf = gui.addFolder('Viewport');
const vpState = state.systems.filter(system => system.name === 'ViewportCanvas')[0];
const names = [ 'gridEnabled' ];
names.forEach(name => vpf.add(vpState, name).listen());
vpf.add(vpState, 'zoom', 0.1, 2.0).step(0.1).listen();
vpf.add(vpState, 'lineWidth', 1.0, 4.0).step(0.5).listen();
vpf.open();

if (module.hot) {
  module.hot.accept(plugins.id, () => {
    try {
      World.stop(state);
      updatePlugins();
      World.start(state);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('plugin reload error', e);
    }
  });
  module.hot.accept('./lib/Core', () => {
    try {
      World.stop(state);
      ({ World } = require('./lib/Core'));
      World.start(state);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('core reload error', e);
    }
  });
}
