import Vue from 'vue';
import Vuetify from 'vuetify';
import icons from 'shared/vuetify/icons';

Vue.use(Vuetify, {
  icons: icons(),
});

const csrf = global.document.createElement('input');
csrf.name = 'csrfmiddlewaretoken';
csrf.value = 'csrfmiddlewaretoken';
global.document.body.append(csrf);
global.document.body.setAttribute('data-app', true);
global.window.Urls = new Proxy(
  {},
  {
    get(obj, prop) {
      return () => prop;
    },
  }
);
