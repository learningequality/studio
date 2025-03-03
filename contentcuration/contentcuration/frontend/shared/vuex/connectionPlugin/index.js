import client from '../../client';
import connectionModule from './connectionModule';

const ConnectionPlugin = store => {
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
        store.dispatch('handleDisconnection');
      }
      return Promise.reject(error);
    },
  );
  client.interceptors.response.handlers.reverse();

  window.addEventListener('online', () => store.dispatch('handleReconnection'));
  window.addEventListener('offline', () => store.dispatch('handleDisconnection'));
};

export default ConnectionPlugin;

function isNetworkError(err) {
  return Boolean(err.isAxiosError) && !err.response;
}
