/**
 * Stub for kolibri-build's RTL CSS runtime module.
 *
 * kolibri-build's WebpackRTLPlugin injects runtime code that accesses
 * window.kolibriCoreAppGlobal["kolibri/rtlcss"].rtlManager to handle
 * dynamic RTL CSS chunk loading. Studio doesn't use this mechanism
 * (RTL CSS is served directly by Django), so we provide a passthrough
 * stub to prevent runtime errors.
 */
window.kolibriCoreAppGlobal = window.kolibriCoreAppGlobal || {};
window.kolibriCoreAppGlobal['kolibri/rtlcss'] = {
  rtlManager: {
    registerBundle() {
      return {
        miniCssF(filename) {
          return filename;
        },
      };
    },
  },
};
