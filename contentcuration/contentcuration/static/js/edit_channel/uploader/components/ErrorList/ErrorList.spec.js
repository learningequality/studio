import { shallowMount, mount } from '@vue/test-utils';

import ErrorList from './ErrorList';

describe('ErrorList', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(ErrorList);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('renders nothing when there are no errors', () => {
    const wrapper = mount(ErrorList, {
      propsData: {
        errors: [],
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders all errors', () => {
    const wrapper = mount(ErrorList, {
      propsData: {
        errors: ['Oops!', 'Something went wrong :('],
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });
});
