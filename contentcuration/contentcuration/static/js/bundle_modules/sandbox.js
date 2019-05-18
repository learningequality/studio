import Vue from 'vue';
import Vuetify from 'vuetify';
import colors from 'vuetify/es5/util/colors';
import Sandbox from '../sandbox/Sandbox.vue';

var VueIntl = require('vue-intl');

require('vuetify/dist/vuetify.min.css');
require('../../less/styles.less');

require('utils/translations');
const State = require('edit_channel/state');

var store = require('edit_channel/uploader/vuex/store');

Vue.use(VueIntl);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: {
    primary: colors.blue.base, // @blue-500
    // secondary: colors.red.lighten4, // #FFCDD2
    // accent: colors.indigo.base // #3F51B5
  },
});

if (State.current_channel) {
  State.current_channel.fetch({ async: false });
}

let testNodes = [
  { id: '2b027d6b7f524db4b84fa27c46e6d94d', title: 'Topic 1', kind: 'topic' },
  { id: '538464b7097a43438e7c8b90e14e888a', title: 'Sample Video', kind: 'video' },
  { id: 'b464253225144b4383a1ce85e8765b40', title: 'Sample Document', kind: 'document' },
  { id: 'eead960941b34c25b46b237a94f99675', title: 'Sample Audio', kind: 'audio' },
  { id: '423b02968cf040a684d8c66f8500f8a1', title: 'Sample HTML', kind: 'html5' },
  { id: '990ac6e540394c95a52ff8719c3e4738', title: 'Sample Exercise', kind: 'exercise' },
  { id: '2b1544480ab04b5ebe9599f87a02f6e9', title: 'Topic 1', kind: 'topic' },
  { id: '0a4e68edda7d4f778a7f962a7830e2c8', title: 'Sample Video', kind: 'video' },
  { id: '93d96fa8448544b29e4ea811545a9077', title: 'Sample Document', kind: 'document' },
  { id: 'b2a745e13e5a4c169453ad5912212980', title: 'Sample Audio', kind: 'audio' },
  { id: '540015fa56c943feb7b68f31f1a30fcc', title: 'Sample HTML', kind: 'html5' },
  { id: '5d24b0e5610e481bb2dff747508c1213', title: 'Sample Exercise', kind: 'exercise' },
  { id: '775d725fdfc149daa6934cea70033285', title: 'Exercise', kind: 'exercise' },
  { id: '34a7b7c1d1f04acfa6eeccf458658ee7', title: 'Topic 2', kind: 'topic' },
];

store.commit('edit_modal/SET_NODES', testNodes);

new Vue({
  el: 'sandbox',
  store,
  ...Sandbox,
});
