import { mount } from '@vue/test-utils';
import NewTopicModal from '../NewTopicModal.vue';
import { factory } from '../../../store';

const store = factory();

function makeWrapper() {
  return mount(NewTopicModal, {
    store,
    propsData: {
      value: true,
    },
  });
}

describe('newTopicModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('renders correctly with default data', () => {
    expect(wrapper.find('[data-test="newtopicmodal"]').exists()).toBe(true);
    expect(wrapper.vm.title).toBe('');
    expect(wrapper.vm.showErrorText).toBe(false);
  });

  it('displays modal with required props', () => {
    const modal = wrapper.findComponent({ name: 'KModal' });
    expect(modal.props('title')).toBeDefined();
    expect(modal.props('title').length).toBeGreaterThan(0);
    expect(modal.props('cancelText')).toBeDefined();
    expect(modal.props('submitText')).toBeDefined();
  });

  it('updates title when user types in textbox', async () => {
    const testInput = 'Test Topic';
    const textbox = wrapper.findComponent({ name: 'KTextbox' });
    await textbox.vm.$emit('input', testInput);
    expect(wrapper.vm.title).toBe(testInput);
  });

  it('shows error state when creating topic with empty title', async () => {
    wrapper.setData({ title: '' });
    await wrapper.vm.create();
    expect(wrapper.vm.titleError).toBeDefined();
    expect(wrapper.vm.titleError.length).toBeGreaterThan(0);
    expect(wrapper.vm.showErrorText).toBe(true);
  });

  it('emits createTopic event with provided title', async () => {
    const testTitle = 'Valid Topic Title';
    wrapper.setData({ title: testTitle });
    await wrapper.vm.create();
    expect(wrapper.emitted('createTopic')).toBeTruthy();
    expect(wrapper.emitted('createTopic')[0]).toEqual([testTitle]);
  });

  it('does not emit createTopic event when title is empty', async () => {
    wrapper.setData({ title: '' });
    await wrapper.vm.create();
    expect(wrapper.emitted('createTopic')).toBeFalsy();
  });

  it('emits cancelCreateTopic event when cancel is called', async () => {
    await wrapper.vm.cancel();
    expect(wrapper.emitted('cancelCreateTopic')).toBeTruthy();
  });

  it('focuses title input when validation fails', async () => {
    const focusSpy = jest.spyOn(wrapper.vm.$refs.title, 'focus');
    wrapper.setData({ title: '' });
    await wrapper.vm.create();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('configures textbox with correct constraints', () => {
    const textbox = wrapper.findComponent({ name: 'KTextbox' });
    expect(textbox.props('label')).toBeDefined();
    expect(textbox.props('maxlength')).toBe(200);
  });

  it('shows invalid state on textbox when error occurs', async () => {
    const textbox = wrapper.findComponent({ name: 'KTextbox' });
    wrapper.setData({ title: '' });
    await wrapper.vm.create();
    expect(textbox.props('invalid')).toBe(true);
    expect(textbox.props('showInvalidText')).toBe(true);
    expect(textbox.props('invalidText')).toBeDefined();
  });

  it('clears error state when valid title is provided', async () => {
    // Invalid title
    wrapper.setData({ title: '' });
    await wrapper.vm.create();
    expect(wrapper.vm.showErrorText).toBe(true);

    // Valid title
    const validTitle = 'Valid Title';
    wrapper.setData({ title: validTitle });
    await wrapper.vm.create();
    expect(wrapper.emitted('createTopic')).toBeTruthy();
    expect(wrapper.emitted('createTopic')[0]).toEqual([validTitle]);
  });
});
