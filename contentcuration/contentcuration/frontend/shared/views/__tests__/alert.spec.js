import { mount } from '@vue/test-utils';
import Alert from '../Alert.vue';

function makeWrapper(props = {}) {
  return mount(Alert, {
    attachToDocument: true,
    propsData: props,
  });
}

describe('alert', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper({ header: '', text: '', messageId: 'testmessageid' });
  });
  afterEach(() => {
    wrapper.destroy();
    delete localStorage['dont_show_messages_testmessageid'];
  });
  it('header and text should be displayed on the alert', () => {
    let testWrapper = makeWrapper({ header: 'testHeader', text: 'testText' });
    expect(testWrapper.find('.v-dialog').text()).toContain('testHeader');
    expect(testWrapper.find('.v-dialog').text()).toContain('testText');
    testWrapper.destroy();
  });
  it('prompt should open the alert', () => {
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
    wrapper.vm.prompt();
    expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
  });
  it('clicking OK button should dismiss alert', () => {
    wrapper.vm.prompt();
    let button = wrapper.find('.v-dialog .v-btn');
    button.trigger('click');
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
  });
  it("should not prompt if don't show again is submitted", () => {
    wrapper.vm.prompt();
    const checkbox = wrapper.find('.v-input--checkbox input');
    checkbox.trigger('change', true);
    expect(wrapper.vm.dontShowAgain).toBe(true);
    wrapper.vm.close();
    wrapper.vm.prompt();
    expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
  });
});
