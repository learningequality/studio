import { mount } from '@vue/test-utils';
import MessageDialog from '../MessageDialog';

function makeWrapper(options) {
  return mount(MessageDialog, {
    propsData: {
      header: 'header',
      text: 'text',
    },
    ...options,
  });
}

describe('messageDialog', () => {
  it('header and text should render properly from props', () => {
    let wrapper = makeWrapper();
    expect(wrapper.find('[data-test="text"]').text()).toEqual('text');
  });
  it('slots should render content correctly', () => {
    let wrapper = makeWrapper({
      slots: {
        default: ['new text'],
        buttons: ['buttons'],
      },
    });
    expect(wrapper.find('[data-test="text"]').text()).toContain('new text');
    expect(wrapper.find('[data-test="buttons"]').text()).toContain('buttons');
  });
  it('close should emit an input event to close the modal', () => {
    let wrapper = makeWrapper();
    wrapper.vm.close();
    expect(wrapper.emitted('input')[0][0]).toBe(false);
  });
});
