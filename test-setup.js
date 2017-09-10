import sinon from 'sinon';

Object.assign(global, {
  window: {
    setTimeout: sinon.spy(),
    requestAnimationFrame: sinon.spy()
  },
  document: {
    createElement: sinon.spy()
  }
});

Object.keys(global.window)
  .forEach(name => global[name] = global.window[name]);

global.reset = () => {
  [global.window, global.document].forEach(obj => {
    Object.keys(obj).forEach(key => {
      if ('reset' in obj[key]) { obj[key].reset(); }
    });
  });
};
