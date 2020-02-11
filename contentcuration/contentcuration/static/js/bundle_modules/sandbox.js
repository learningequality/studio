import Vue from 'vue';
import Vuetify from 'vuetify';
import colors from 'vuetify/es5/util/colors';
import Sandbox from '../sandbox/Sandbox.vue';

// const Vuex = require('vuex');

var VueIntl = require('vue-intl');
// const editModal = require('edit_channel/uploader/vuex/store');
// const fileUpload = require('edit_channel/vuexModules/fileUpload');
// const contentNodesModule = require('edit_channel/vuexModules/contentNodes');

require('vuetify/dist/vuetify.min.css');
require('../../less/styles.less');

require('utils/translations');
const State = require('edit_channel/state');

// if (Vue.default) {
//   // Compatibility for differential behaviour of require import
//   // of ES6 export default in webpack vs Jest
//   Vue = Vue.default;
// }

Vue.use(VueIntl);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: {
    primary: colors.blue.base, // @blue-500
    primaryBackground: colors.blue.lighten5,
    greyBackground: colors.grey.lighten3,
    greenSuccess: '#4CAF50',
    topic: colors.grey.base,
    video: '#283593',
    audio: '#f06292',
    document: '#ff3d00',
    exercise: '#4db6ac',
    html5: '#ff8f00',
    slideshow: '#4ece90',
    unsupported: colors.red.base,
  },
});

window.preferences = {
  license: 'Public Domain',
  // author: 'Default Author',
  //   provider: 'Default Provider',
  //   aggregator: 'Default Aggregator',
  copyright_holder: 'Default Copyright Holder',
  //   license_description: 'Default License Description',
  //   mastery_model: 'm_of_n',
  //   m_value: 2,
  //   n_value: 5,
};

State.openChannel({});

if (State.current_channel) {
  State.current_channel.fetch({ async: false });
}

// TODO: update this to use proper parent tree logic
State.currentNode = {
  id: window.root_id,
  title: 'Sandbox Topic',
  metadata: {
    max_sort_order: 0,
  },
};

new Vue({
  el: 'sandbox',
  ...Sandbox,
});
