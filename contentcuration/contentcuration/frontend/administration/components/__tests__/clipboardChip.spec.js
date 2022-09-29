import { mount } from '@vue/test-utils';
import ClipboardChip from '../ClipboardChip.vue';

function makeWrapper() {
  return mount(ClipboardChip, {
    propsData: {
      value: 'testtoken',
    },
  });
}

describe('clipboardChip', () => {
  let wrapper;
  beforeEach(() => {
    navigator.clipboard = {
      writeText: jest.fn(),
    };
    wrapper = makeWrapper();
  });
  afterEach(() => {
    delete navigator.clipboard;
  });
  it('should fire a copy operation on button click', () => {
    const copyToClipboard = jest.fn();
    wrapper.setMethods({ copyToClipboard });
    wrapper.find('[data-test="copy"]').trigger('click');
    expect(copyToClipboard).toHaveBeenCalled();
  });
});
