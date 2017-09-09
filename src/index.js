let hello = require('./lib/core').default;

import './index.css';

// const world = {};

let count = 0;
function update () {
  count++;
  document.getElementById('title').innerText = `${hello()} ${count}`;
  setTimeout(update, 16);
}
setTimeout(update, 16);

if (module.hot) {
  module.hot.accept('./lib/core.js', function (/* loaded */) {
    hello = require('./lib/core.js').default;
  });
}
