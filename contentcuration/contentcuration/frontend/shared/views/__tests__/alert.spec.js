import { mount } from '@vue/test-utils';
import Alert from '../Alert.vue';

function makeWrapper() {
  return mount(Alert, {
    attachTo: document.body,
    propsData: {
      header: '',
      text: '',
      messageId: 'testmessageid',
      value: true,
    },
  });
}

describe('alert', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  afterEach(() => {
    wrapper.destroy();
    delete localStorage['dont_show_messages_testmessageid'];
  });

  it('clicking OK button should dismiss alert', () => {
    wrapper.find('[data-test="ok"]').trigger('click');
    expect(wrapper.emitted('input')[0][0]).toBe(false);
  });

  it("should not prompt if don't show again is submitted", () => {
    localStorage['dont_show_messages_testmessageid'] = true;
    wrapper = makeWrapper();
    expect(wrapper.vm.open).toBe(false);
  });
});
