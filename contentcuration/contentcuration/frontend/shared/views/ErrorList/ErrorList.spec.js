import { shallowMount, mount } from '@vue/test-utils';

import ErrorList from './ErrorList';

describe('ErrorList', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(ErrorList);

    expect(wrapper.exists()).toBe(true);
  });

  it('renders all errors', () => {
    const wrapper = mount(ErrorList, {
      propsData: {
        errors: ['Oops!', 'Something went wrong :('],
      },
    });

    expect(wrapper.html()).toContain('Oops!');
    expect(wrapper.html()).toContain('Something went wrong :(');
  });
});
