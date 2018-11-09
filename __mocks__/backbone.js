const Backbone = require('backbone');

let requestSuccess = true;
let requestData = [];
let requestError = 'Error';

function setResponse({ success, data, error }) {
  requestSuccess = success;
  requestData = data;
  requestError = error;
}

Backbone.sync = jest.fn((method, object, options) => {
  if (requestSuccess) {
    options.success(requestData);
  } else {
    options.error(requestError);
  }
});

Backbone.__setResponse = setResponse;

module.exports = Backbone;
