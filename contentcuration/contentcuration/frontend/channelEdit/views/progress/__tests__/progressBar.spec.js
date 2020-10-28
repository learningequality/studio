import { mount } from '@vue/test-utils';
import ProgressBar from '../ProgressBar';

function makeWrapper(propsData = {}) {
  return mount(ProgressBar, {
    propsData,
  });
}

describe('progressBar', () => {
  it('progress bar should be hidden if task progress is not tracked', () => {
    const wrapper = makeWrapper({
      progressPercent: null,
    });
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(false);
  });
  it('should show success status if task succeeded', () => {
    const wrapper = makeWrapper({
      progressPercent: 100,
    });
    expect(wrapper.vm.isDone).toBe(true);
  });
});
