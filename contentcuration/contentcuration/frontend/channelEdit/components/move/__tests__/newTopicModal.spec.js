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
  it('dialog should reflect v-model value', () => {
    expect(wrapper.vm.dialog).toBe(true);
    wrapper.setProps({ value: false });
    expect(wrapper.vm.dialog).toBe(false);
  });
  it('create button should validate form', () => {
    wrapper.find('[data-test="create"]').trigger('click');
    expect(wrapper.find({ ref: 'form' }).vm.value).toBe(false);
    expect(wrapper.emitted('createTopic')).toBeFalsy();
  });
  it('create button should emit createTopic event if valid', () => {
    wrapper.setData({ title: 'test title' });
    wrapper.find('[data-test="create"]').trigger('click');
    expect(wrapper.emitted('createTopic')[0][0]).toBe('test title');
  });
  it('close button should emit input event with false value', () => {
    wrapper.find('[data-test="close"]').trigger('click');
    expect(wrapper.emitted('input')[0][0]).toBe(false);
  });
  it('closing modal should clear title', () => {
    wrapper.find('[data-test="close"]').trigger('click');
    expect(wrapper.vm.title).toBe('');
  });
});
