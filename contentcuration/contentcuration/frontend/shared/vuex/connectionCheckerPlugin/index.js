import connectionModule from "./connectionModule";

export default function(client) {
  return store => {
    // dynamically register the connection module to the vuex store
    store.registerModule('connection', connectionModule)

    // register an axios interceptor that uses the connection module
    client.interceptors.response.handlers.reverse()
    client.interceptors.response.use(
      request => {
        console.log("INTERCEPTOR")
        if (!store.state.online) {
          store.dispatch("handleReconnection");
        }
        return request;
      },
      error => {
        if (isNetworkError(error)) {
          console.log("INTERCEPTOR ERROR")
          console.log("interceptor network error triggered");
          store.dispatch("handleBrokenConnection");
        }
        Promise.reject(error);
      }
    );
    client.interceptors.response.handlers.reverse()
  };
}

function isNetworkError(err) {
  return !!err.isAxiosError && !err.response;
}
