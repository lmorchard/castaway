import hello from './lib/core';

import './index.css';

const systems = { hello };

let count = 0;
function update () {
  count++;
  document.getElementById('title').innerText = `${systems.hello()} ${count}`;
  setTimeout(update, 16);
}
setTimeout(update, 16);

if (module.hot) {
  module.hot.accept('./lib/core.js', function (loaded) {
    systems.hello = require('./lib/core.js').default;
  });
}
