import { addDecorator } from '@storybook/vue';
import Vue from 'vue';
import Vuetify from 'vuetify';

import 'vuetify/dist/vuetify.min.css';

import { theme } from 'shared/vuetify';

Vue.use(Vuetify, {
  theme: theme()
});

addDecorator(() => ({
  template: '<v-app><v-content><story/></v-content></v-app>',
}));
