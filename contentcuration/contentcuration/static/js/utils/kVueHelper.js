// assumes kolibriGlobal variable is in window. Attached via Django tags
var Vue = window.kolibriGlobal.lib.vue;

// Helper function for using Kolibri Components. Returns a mounted ("initialized") vue component,
// which includes a $el property, much like a Backbone View
// NOTE: remember to call the component's $destroy method when done with it.
//       Not doing so could lead to memory leaks.
export default function(componentDefObject, options) {
  const component = Vue.extend(componentDefObject);

  // Custom, from Kolibri. No need for `Vue.use()` or `new Vuex.Store`
  if (!window.kolibriGlobal.coreVue.vuex.store.default.__initialized) {
    window.kolibriGlobal.coreVue.vuex.store.default.registerModule();
  }

  // IDEA add an event API

  // no custom store defined, use kolibri's
  if(!options.store){
    options.store = window.kolibriGlobal.coreVue.vuex.store.default;
  }

  const instantiatedComponent = new component(options);

  // If no el is provided, must call $mount manually. Uses a dummy $el
  if(!options.el){
    return instantiatedComponent.$mount();
  }

  return instantiatedComponent;
}
