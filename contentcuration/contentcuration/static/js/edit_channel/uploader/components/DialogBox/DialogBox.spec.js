import { shallowMount } from '@vue/test-utils';

import DialogBox from './DialogBox.vue';

describe('DialogBox', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(DialogBox);

    expect(wrapper.isVueInstance()).toBe(true);
  });
});
