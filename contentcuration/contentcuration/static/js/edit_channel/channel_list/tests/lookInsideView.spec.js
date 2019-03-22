import { shallowMount } from '@vue/test-utils';
import LookInsideView from './../views/LookInsideView.vue';
import { localStore, mockFunctions } from './data.js';

function makeWrapper(props = {}) {
  return shallowMount(LookInsideView, {
    store: localStore,
    propsData: {
      nodeID: 'abc',
      channel: {},
    },
  });
}

describe('lookInsideView', () => {
  it('should load details when rendered', () => {
    let wrapper = makeWrapper();
    // TODO: Need to mock endpoint to get rid of UnhandledPromiseRejectionWarning
    expect(mockFunctions.loadNodeDetails).toHaveBeenCalled();
  });
});
