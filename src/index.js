import './index.css';

import dat from 'dat-gui';

let { World } = require('./lib/Core');

const world = window.world = World.create();

let plugins;
function updatePlugins() {
  plugins = require.context('./lib/plugins', false, /\.js$/);
  World.install(world, plugins.keys().map(key => plugins(key)));
}
updatePlugins();

World.configure(world, [
  [ 'ViewportCanvas', { debug: true } ],
  'DrawStats',
  'Position',
  'Motion',
  'Collision'
]);

World.insert(world,
  { Name: { name: 'a1' },
    CanvasSprite: { name: 'hero' },
    Position: {},
    Collidable: {},
    Motion: { dx: 0, dy: 0, drotation: Math.PI / 2 } },
  { Name: { name: 'a2' },
    CanvasSprite: { name: 'asteroid' },
    Position: { x: 200, y: 0 },
    Collidable: {},
    Motion: { dx: 0, dy: 0, drotation: -Math.PI / 3 } },
  { Name: { name: 'a3' },
    CanvasSprite: { name: 'enemyscout' },
    Position: { x: -200, y: 0 },
    Collidable: {},
    Motion: { dx: 0, dy: 0, drotation: -Math.PI } }
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
vpf.open();

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
