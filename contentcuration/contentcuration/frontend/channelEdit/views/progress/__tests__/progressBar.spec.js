import { mount } from '@vue/test-utils';
import ProgressBar from '../ProgressBar';
import store from '../../../store';

function makeWrapper(computed = {}) {
  return mount(ProgressBar, {
    store,
    computed,
  });
}

describe('progressBar', () => {
  it('should show an error icon if the task failed', () => {
    let wrapper = makeWrapper({
      currentTaskError() {
        return { data: 'nope' };
      },
    });
    expect(wrapper.find('[data-test="error"]').exists()).toBe(true);
  });
  it('should show success icon if task succeeded', () => {
    let wrapper = makeWrapper({
      progressPercent() {
        return 100;
      },
    });
    expect(wrapper.find('[data-test="success"]').exists()).toBe(true);
  });
  it('progress bar should be hidden if task progress is not tracked', () => {
    let wrapper = makeWrapper({
      progressPercent() {
        return -1;
      },
    });
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(false);
  });
});
