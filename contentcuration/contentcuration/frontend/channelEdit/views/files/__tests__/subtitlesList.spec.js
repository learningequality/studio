import { mount } from '@vue/test-utils';
import SubtitlesList from '../supplementaryLists/SubtitlesList.vue';

function makeWrapper() {
  return mount(SubtitlesList, {
    attachTo: document.body,
    propsData: {
      nodeId: 'test',
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
