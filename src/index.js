import './index.css';

import dat from 'dat-gui';

let { World } = require('./lib/Core');

const world = window.world = World.create();

let plugins;
function updatePlugins() {
  plugins = require.context('./lib/plugins', false, /^(?!.*test).*\.js$/);
  World.install(world, plugins.keys().map(key => plugins(key)));
}
updatePlugins();

World.configure(world, [
  [ 'ViewportCanvas', { debug: true } ],
  'DebugCanvas',
  'DrawStats',
  'Position',
  'Motion',
  'Thruster',
  'Collision',
  'Bounce',
]);

World.insert(world,
  {
    Name: { name: 'a1' },
    CanvasSprite: { name: 'hero' },
    Position: { rotation: Math.PI },
    Collidable: { },
    Motion: { dx: 0, dy: 0, drotation: 0 },
    Thruster: { deltaV: 100, maxV: 500 },
    Bounce: { },
  },
  {
    Name: { name: 'a2' },
    CanvasSprite: { name: 'asteroid' },
    Position: { x: 200, y: 0, rotation: Math.PI },
    Collidable: { },
    Motion: { dx: 0, dy: 0, drotation: 0 },
    Thruster: { deltaV: 100, maxV: 500 },
    Bounce: { },
  },
  {
    Name: { name: 'a3' },
    CanvasSprite: { name: 'enemyscout' },
    Position: { x: -200, y: 0, rotation: 0 },
    Collidable: { },
    Motion: { dx: 0, dy: 0, drotation: 0 },
    Thruster: { deltaV: 200, maxV: 600 },
    Bounce: { mass: 100000 },
  }
);

World.start(world);

const gui = new dat.GUI();

const worldFolder = gui.addFolder('World');
worldFolder.add(world.runtime, 'isPaused').listen();
worldFolder.open();

const vpf = gui.addFolder('Viewport');
const vpconfig = world.configs.filter(system => system.name === 'ViewportCanvas')[0];
const names = [ 'gridEnabled' ];
names.forEach(name => vpf.add(vpconfig, name).listen());
vpf.add(vpconfig, 'zoom', 0.1, 2.0).step(0.1).listen();
vpf.add(vpconfig, 'lineWidth', 1.0, 4.0).step(0.5).listen();

const systemFolders = {};
['DebugCanvas', 'Position'].forEach(systemName => {
  const folder = systemFolders[systemName] = gui.addFolder(systemName);
  world.configs
    .filter(s => s.name === systemName)
    .forEach(c => folder.add(c, 'debug').listen());
});

if (module.hot) {
  module.hot.accept(plugins.id, () => {
    try {
      World.stop(world);
      updatePlugins();
      World.start(world);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('plugin reload error', e);
    }
  });
  module.hot.accept('./lib/Core', () => {
    try {
      World.stop(world);
      ({ World } = require('./lib/Core'));
      World.start(world);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('core reload error', e);
    }
  });
}
