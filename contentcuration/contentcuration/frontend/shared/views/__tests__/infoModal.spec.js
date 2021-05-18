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

  it('clicking the info button should open the dialog', () => {
    expect(wrapper.contains('[data-test="info-dialog"]')).toBe(false);

    wrapper.find('[data-test="info-icon"]').trigger('click');
    expect(wrapper.find('[data-test="info-dialog"]').isVisible()).toBe(true);
  });

  it('clicking the close button should close the dialog', () => {
    wrapper.find('[data-test="info-icon"]').trigger('click');
    expect(wrapper.find('[data-test="info-dialog"]').isVisible()).toBe(true);

    wrapper.find('[data-test="info-dialog"]').vm.$emit('cancel');
    expect(wrapper.contains('[data-test="info-dialog"]')).toBe(false);
  });
});
