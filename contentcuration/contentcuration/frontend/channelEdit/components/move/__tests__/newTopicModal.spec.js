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
  it('dialog should reflect v-model value', async () => {
    expect(wrapper.vm.dialog).toBe(true);
    wrapper.setProps({ value: false });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.dialog).toBe(false);
  });
  it('create button should validate form', async () => {
    wrapper.find('[data-test="create"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ ref: 'form' }).vm.value).toBe(false);
    expect(wrapper.emitted('createTopic')).toBeFalsy();
  });
  it('create button should emit createTopic event if valid', async () => {
    wrapper.setData({ title: 'test title' });
    await wrapper.vm.$nextTick();
    wrapper.findComponent('[data-test="create"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('createTopic')[0][0]).toBe('test title');
  });
  it('close button should emit input event with false value', async () => {
    wrapper.findComponent('[data-test="close"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('input')[0][0]).toBe(false);
  });
  it('closing modal should clear title', async () => {
    wrapper.findComponent('[data-test="close"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.title).toBe('');
  });
});
