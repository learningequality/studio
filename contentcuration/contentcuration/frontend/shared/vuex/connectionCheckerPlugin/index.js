import connectionModule from './connectionModule';

export function ConnectionCheckerPlugin(client) {
  return store => {
    // dynamically register the connection module to the vuex store
    store.registerModule('connection', connectionModule);

    // register an axios interceptor that uses the connection module
    client.interceptors.response.handlers.reverse();
    client.interceptors.response.use(
      request => {
        if (!store.state.online) {
          store.dispatch('handleReconnection');
        }
        return request;
      },
      error => {
        if (isNetworkError(error)) {
          store.dispatch('handleBrokenConnection');
        }
        Promise.reject(error);
      }
    );
    client.interceptors.response.handlers.reverse();
  };
}

const registerConnectionChecker = (client, store) => ConnectionCheckerPlugin(client)(store);

export default registerConnectionChecker;

function isNetworkError(err) {
  return !!err.isAxiosError && !err.response;
}
