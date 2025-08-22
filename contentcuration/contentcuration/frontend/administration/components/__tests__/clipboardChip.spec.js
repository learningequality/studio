import { mount } from '@vue/test-utils';
import ClipboardChip from '../ClipboardChip.vue';
import { factory } from '../../store';

function makeWrapper() {
  return mount(ClipboardChip, {
    store: factory(),
    propsData: {
      value: 'testtoken',
    },
  });
}

describe('clipboardChip', () => {
  let wrapper;

  beforeEach(() => {
    navigator.clipboard = {
      writeText: jest.fn().mockImplementation(() => Promise.resolve()),
    };
    wrapper = makeWrapper();
  });

  afterEach(() => {
    delete navigator.clipboard;
  });

  it('should fire a copy operation on button click', async () => {
    await wrapper.findComponent({ ref: 'copyButton' }).trigger('click');
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
