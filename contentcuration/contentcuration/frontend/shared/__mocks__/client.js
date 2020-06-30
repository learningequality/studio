const defaultResponse = {
  // `data` is the response that was provided by the server
  data: {},

  // `status` is the HTTP status code from the server response
  status: 200,

  // `statusText` is the HTTP status message from the server response
  statusText: 'OK',

  // `headers` the headers that the server responded with
  // All header names are lower cased
  headers: {},

  // `config` is the config that was provided to `axios` for the request
  config: {},

  // `request` is the request that generated this response
  // It is the last ClientRequest instance in node.js (in redirects)
  // and an XMLHttpRequest instance in the browser
  request: {},
};

const resolve = (options = {}) => {
  return Promise.resolve({
    defaultResponse,
    ...options,
  });
};

const client = {
  get: jest.fn(resolve),
  post: jest.fn(resolve),
  put: jest.fn(resolve),
  patch: jest.fn(resolve),
  delete: jest.fn(resolve),
};

client.__setResponse = (method, options) => {
  client[method.toLowerCase()].mockImplementationOnce(() => resolve(options));
};

export default client;
