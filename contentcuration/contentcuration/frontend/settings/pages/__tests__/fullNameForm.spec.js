import { mount } from '@vue/test-utils';
import { factory } from '../../store';
import FullNameForm from '../Account/FullNameForm';

const store = factory();

function makeWrapper() {
  return mount(FullNameForm, {
    store,
    propsData: {
      value: true,
    },
  });
}

describe('fullNameForm', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  describe('validation', () => {
    const onSubmit = jest.fn();
    beforeEach(() => {
      onSubmit.mockReset();
      wrapper.setMethods({ onSubmit });
    });
    it('should fail if first_name is null', () => {
      wrapper.setData({ last_name: 'last' });
      wrapper.vm.submit();
      expect(onSubmit).not.toHaveBeenCalled();
    });
    it('should fail if first_name is a blank string', () => {
      wrapper.setData({ last_name: 'last', first_name: ' ' });
      wrapper.vm.submit();
      expect(onSubmit).not.toHaveBeenCalled();
    });
    it('should succeed if form is valid', () => {
      wrapper.setData({ first_name: 'first', last_name: 'last' });
      wrapper.vm.submit();
      expect(onSubmit).toHaveBeenCalled();
    });
  });
  it('onSubmit should call saveFullName if form is valid', () => {
    wrapper.setData({ first_name: 'first', last_name: 'last' });
    const saveFullName = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ saveFullName });
    wrapper.vm.onSubmit();
    expect(saveFullName).toHaveBeenCalled();
  });
});
