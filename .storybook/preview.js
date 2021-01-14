import { addDecorator } from '@storybook/vue';
import Vue from 'vue';
import Vuetify from 'vuetify';

import 'vuetify/dist/vuetify.min.css';

import { icons, theme } from 'shared/vuetify';

Vue.use(Vuetify, {
  theme: theme(),
  icons: icons(),
});

addDecorator(() => ({
  template: '<v-app><v-content><story/></v-content></v-app>',
}));
