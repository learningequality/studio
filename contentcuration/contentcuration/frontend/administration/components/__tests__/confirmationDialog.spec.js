import { mount } from '@vue/test-utils';
import ConfirmationDialog from '../ConfirmationDialog.vue';

function makeWrapper() {
  return mount(ConfirmationDialog, {
    propsData: {
      title: 'title',
      text: 'text',
      confirmButtonText: 'confirm',
    },
  });
}

describe('confirmationDialog', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should emit input with false value on close', () => {
    wrapper.find('[data-test="close"]').trigger('click');
    expect(wrapper.emitted('input')[0][0]).toBe(false);
  });
  it('should emit confirm event when confirm button is clicked', () => {
    wrapper.find('[data-test="confirm"]').trigger('click');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });
});
