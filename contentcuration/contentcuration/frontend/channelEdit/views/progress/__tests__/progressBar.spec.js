import { mount } from '@vue/test-utils';
import ProgressBar from '../ProgressBar';
import { factory } from '../../../store';

const store = factory();

function makeWrapper(computed = {}) {
  return mount(ProgressBar, {
    store,
    computed,
  });
}

describe('progressBar', () => {
  it('progress bar should be hidden if task progress is not tracked', () => {
    let wrapper = makeWrapper({
      progress() {
        return null;
      },
    });
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(false);
  });
  it('should show success status if task succeeded', () => {
    let wrapper = makeWrapper({
      progress() {
        return 100;
      },
    });
    expect(wrapper.vm.isDone).toBe(true);
  });
});
