import Vue from 'vue';
import VueRouter from 'vue-router';
import TipTapEditor from '../shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

Vue.use(VueRouter);

new Vue({
  render: h => h(TipTapEditor),
}).$mount('#app');
