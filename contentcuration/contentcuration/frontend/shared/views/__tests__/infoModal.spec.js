import { mount } from '@vue/test-utils';
import InfoModal from '../InfoModal.vue';

function makeWrapper(props = {}) {
  return mount(InfoModal, {
    propsData: props,
  });
}

describe('InfoModal', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('clicking the info button should open the dialog', async () => {
    expect(wrapper.findComponent('[data-test="info-dialog"]').exists()).toBe(false);

    wrapper.findComponent('[data-test="info-icon"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent('[data-test="info-dialog"]').isVisible()).toBe(true);
  });

  it('clicking the close button should close the dialog', async () => {
    wrapper.findComponent('[data-test="info-icon"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent('[data-test="info-dialog"]').isVisible()).toBe(true);

    wrapper.findComponent('[data-test="info-dialog"]').vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent('[data-test="info-dialog"]').exists()).toBe(false);
  });
});
