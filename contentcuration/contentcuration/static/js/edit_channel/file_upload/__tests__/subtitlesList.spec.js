import { mount } from '@vue/test-utils';
import SubtitlesList from '../views/SubtitlesList.vue';

function makeWrapper() {
  return mount(SubtitlesList, {
    attachToDocument: true,
    propsData: {
      nodeIndex: 1,
    },
    stubs: {
      SupplementaryList: true,
    },
  });
}

describe('subtitlesList', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('subtitlePreset should be a valid subtitle preset', () => {
    expect(wrapper.vm.subtitlePreset.subtitle).toBe(true);
  });
});
