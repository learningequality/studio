import { mount } from '@vue/test-utils';
import CommunityLibraryStatusButton from '../CommunityLibraryStatusButton.vue';

describe('CommunityLibraryStatusButton', () => {
  it('pushing the button emits the click event', () => {
    const wrapper = mount(CommunityLibraryStatusButton, {
      propsData: {
        status: 'approved',
      },
    });
    wrapper.find('button').trigger('click');

    expect(wrapper.emitted('click')).toBeTruthy();
  });
});
