import { mount } from '@vue/test-utils';
import CopyToken from '../CopyToken.vue';

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
    const token = wrapper.findComponent({ name: 'v-text-field' });
    expect(token.props().value).toEqual('testt-oken');
  });
  // TODO: Need to figure out a way to test if text was properly
  //        copied (document.execCommand not supported)
});
