import { mount } from '@vue/test-utils';
import StudioCopyToken from '../Account/StudioCopyToken.vue';

function makeWrapper(props = {}) {
  return mount(StudioCopyToken, {
    propsData: {
      token: 'testtoken',
      ...props,
    },
    mocks: {
      $store: { dispatch: jest.fn() },
      $tr: key => key,
    },
  });
}

describe('StudioCopyToken', () => {
  it('displays hyphenated token by default', () => {
    const wrapper = makeWrapper();
    const input = wrapper.findComponent({ ref: 'tokenInput' });
    expect(input.props('value')).toBe('testt-oken');
  });

  it('displays token without hyphen if hyphenate is false', () => {
    const wrapper = makeWrapper({ hyphenate: false });
    const input = wrapper.findComponent({ ref: 'tokenInput' });
    expect(input.props('value')).toBe('testtoken');
  });

  it('shows loader when loading is true', () => {
    const wrapper = makeWrapper({ loading: true });
    expect(wrapper.findComponent({ name: 'KCircularLoader' }).exists()).toBe(true);
    expect(wrapper.findComponent({ ref: 'tokenInput' }).exists()).toBe(false);
  });

  it('should fire a copy operation on button click', async () => {
    const writeText = jest.fn().mockResolvedValue();
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    const wrapper = makeWrapper();
    await wrapper.find('.copy-button').trigger('click');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('testt-oken');
  });

  it('dispatches snackbar on successful copy', async () => {
    const writeText = jest.fn().mockResolvedValue();
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    const wrapper = makeWrapper();
    await wrapper.find('.copy-button').trigger('click');
    expect(wrapper.vm.$store.dispatch).toHaveBeenCalledWith('showSnackbarSimple', 'tokenCopied');
  });

  it('dispatches snackbar on failed copy', async () => {
    const writeText = jest.fn().mockRejectedValue();
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    const wrapper = makeWrapper();
    await wrapper.find('.copy-button').trigger('click');
    expect(wrapper.vm.$store.dispatch).toHaveBeenCalledWith(
      'showSnackbarSimple',
      'tokenCopyFailed',
    );
  });

  it('dispatches snackbar if token is empty', async () => {
    const wrapper = makeWrapper({ token: '   ' });
    await wrapper.find('.copy-button').trigger('click');
    expect(wrapper.vm.$store.dispatch).toHaveBeenCalledWith(
      'showSnackbarSimple',
      'tokenCopyFailed',
    );
  });
});
