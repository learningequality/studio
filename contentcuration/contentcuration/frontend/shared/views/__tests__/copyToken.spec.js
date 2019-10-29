import { mount } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';
import CopyToken from '../CopyToken.vue';

Vue.use(Vuetify);

function makeWrapper() {
  return mount(CopyToken, {
    propsData: {
      token: 'testtoken',
    },
  });
}

describe('copyToken', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('text should be populated on load', () => {
    let token = wrapper.find({ name: 'v-text-field' });
    expect(token.props().value).toEqual('testt-oken');
    expect(wrapper.vm.copyStatus === 'IDLE');
  });
  // TODO: Need to figure out a way to test if text was properly
  //        copied (document.execCommand not supported)
});
