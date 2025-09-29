import { mount } from '@vue/test-utils';
import ToggleText from '../ToggleText.vue';

function makeWrapper(splitAt) {
  return mount(ToggleText, {
    propsData: {
      text: 'test test test test',
      splitAt: splitAt,
    },
  });
}

describe('toggleText', () => {
  it('text should be split around the split index', () => {
    let splitWrapper = makeWrapper(5);
    expect(splitWrapper.vm.overflowText).toBe(' test test test');
    splitWrapper = makeWrapper(17);
    expect(splitWrapper.vm.overflowText).toBeFalsy();
  });
  it('clicking the toggle button should collapse/expand text', async () => {
    const splitWrapper = makeWrapper(5);
    const toggler = splitWrapper.find('.toggler');
    const overflow = splitWrapper.find('[data-test="overflow"]');
    expect(overflow.isVisible()).toBe(false);
    toggler.trigger('click');
    await splitWrapper.vm.$nextTick();
    expect(overflow.isVisible()).toBe(true);
    toggler.trigger('click');
    await splitWrapper.vm.$nextTick();
    expect(overflow.isVisible()).toBe(false);
  });
});
