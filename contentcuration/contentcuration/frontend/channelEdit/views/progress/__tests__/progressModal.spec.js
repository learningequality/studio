import { mount } from '@vue/test-utils';
import ProgressModal from '../ProgressModal';
import { factory } from '../../../store';

const store = factory();

const task = { task: { id: 123, task_type: 'test-task' } };
const tasks = [
  { task: { id: 123, task_type: 'test-task' } },
  { task: { id: 456, task_type: 'test-task-2' } },
];

function makeWrapper(computed = {}) {
  return mount(ProgressModal, {
    store,
    computed: {
      currentTasks() {
        return tasks;
      },
      currentTask() {
        return task;
      },
      isPublishing() {
        return true;
      },
      ...computed,
    },
  });
}

describe('progressModal', () => {
  it('should be hidden if the user is not syncing or publishing', () => {
    let wrapper = makeWrapper({
      isSyncing() {
        return false;
      },
      nothingToSync() {
        return false;
      },
      isPublishing() {
        return false;
      },
    });
    expect(wrapper.find('[data-test="progressmodal"]').exists()).toBe(false);
  });
  it('should show an error if the task failed', () => {
    let wrapper = makeWrapper({
      currentTaskError() {
        return { data: 'nope' };
      },
    });
    expect(wrapper.find('[data-test="error"]').exists()).toBe(true);
  });
  it('refresh button should be shown if task is done', () => {
    let wrapper = makeWrapper({
      progressPercent() {
        return 100;
      },
    });
    expect(wrapper.find('[data-test="refresh"]').exists()).toBe(true);
  });
  it('refresh button should be shown if task failed', () => {
    let wrapper = makeWrapper({
      currentTaskError() {
        return { data: 'uh-oh!' };
      },
    });
    expect(wrapper.find('[data-test="refresh"]').exists()).toBe(true);
  });
  it('refresh button should reload the page', () => {
    const cancelTaskAndClose = jest.fn();
    let wrapper = makeWrapper({
      progressPercent() {
        return 100;
      },
    });
    wrapper.setMethods({ cancelTaskAndClose });
    wrapper.find('[data-test="refresh"]').trigger('click');
    expect(cancelTaskAndClose).toHaveBeenCalled();
  });

  describe('on cancel task', () => {
    let wrapper;
    beforeEach(() => {
      wrapper = makeWrapper({
        progressPercent() {
          return 50;
        },
      });
    });
    it('stop task button should be shown if task is in progress', () => {
      expect(wrapper.find('[data-test="stop"]').exists()).toBe(true);
    });
    it('clicking stop button should switch window to confirmation window', () => {
      wrapper.find('[data-test="stop"]').trigger('click');
      expect(wrapper.vm.step).toBe(2);
    });
    it('clicking stop button on confirmation window should cancel the task', () => {
      const cancelTaskAndClose = jest.fn();
      wrapper.setMethods({ cancelTaskAndClose });
      wrapper.setData({ step: 2 });
      wrapper.find('[data-test="confirmstop"]').trigger('click');
      expect(cancelTaskAndClose).toHaveBeenCalled();
    });
    it('clicking cancel button on confirmation window should go back to progress window', () => {
      const cancelTaskAndClose = jest.fn();
      wrapper.setMethods({ cancelTaskAndClose });
      wrapper.setData({ step: 2 });
      wrapper.find('[data-test="cancelstop"]').trigger('click');
      expect(wrapper.vm.step).toBe(1);
      expect(cancelTaskAndClose).not.toHaveBeenCalled();
    });
  });
});
