const DEFAULT_CHECK_INTERVAL = 5000;
const RUNNING_TASK_INTERVAL = 2000;

let timerID = null;
let currentInterval = DEFAULT_CHECK_INTERVAL;

const asyncTasksModule = {
  state: {
    asyncTasks: [],
    currentTaskError: null,
    currentTask: null,
    callbacks: {},
    progressPercent: 0.0,
  },
  getters: {
    asyncTasks(state) {
      return state.asyncTasks;
    },
    currentTaskError(state) {
      return state.currentTaskError;
    },
    currentTask(state) {
      return state.currentTask;
    },
    callbacks(state) {
      return state.callbacks;
    },
    progressPercent(state) {
      return state.progressPercent;
    },
  },
  actions: {
    startTask(store, payload) {
      let tasks = store.getters.asyncTasks;
      tasks.push(payload.task);

      let startPercent = 0.0;
      if (!payload.task.is_progress_tracking) {
        startPercent = -1;
      }

      store.commit('SET_PROGRESS', startPercent);
      store.commit('SET_CURRENT_TASK', payload);
      // force an immediate update to quickly get a first state update
      store.dispatch('updateTaskList');
    },

    clearCurrentTask(store) {
      store.commit('SET_CURRENT_TASK', null);
      store.commit('SET_CURRENT_TASK_ERROR', null);
      store.commit('SET_PROGRESS', 0.0);
      store.dispatch('activateTaskUpdateTimer');
    },

    deactivateTaskUpdateTimer() {
      if (timerID) {
        clearTimeout(timerID);
      }
    },

    activateTaskUpdateTimer(store) {
      const currentTask = store.getters.currentTask;
      currentInterval = DEFAULT_CHECK_INTERVAL;
      if (currentTask) {
        currentInterval = RUNNING_TASK_INTERVAL;
      }
      if (timerID) {
        clearTimeout(timerID);
      }

      timerID = setTimeout(function() {
        store.dispatch('updateTaskList');
      }, currentInterval);
    },

    deleteCurrentTask(store) {
      const currentTask = store.getters.currentTask;
      if (currentTask) {
        $.ajax({
          method: 'DELETE',
          url: '/api/task/' + currentTask.id,
        });
      }
    },
    updateTaskList(store) {
      let currentTask = store.getters.currentTask;
      let currentTaskError = store.getters.currentTaskError;
      let url = '/api/task';
      // if we have a running task, only get status on it.
      if (currentTask && currentTask.id) {
        url += '/' + currentTask.id;
      }

      // if we're inside a channel, make sure we only check tasks relevant to the channel.
      // note that we do this even for specific task lookups to check channel access.
      if (window.channel) {
        url += '?channel_id=' + window.channel.id;
      }

      $.ajax({
        method: 'GET',
        url: url,
        dataType: 'json',
        success: function(data) {
          let runningTask = null;

          // Treat the return value as an array even though we're getting a single task
          // because the code is expecting an array of tasks to check.
          if (currentTask) {
            data = [data];
          }

          if (data && data.length > 0) {
            for (let i = 0; i < data.length; i++) {
              const task = data[i];
              if (!currentTask && task.status === 'STARTED') {
                store.commit('SET_CURRENT_TASK', { task: task });
                currentTask = task;
              }
              // TODO: Figure out how to set currentTask upon page reload.
              if (currentTask && task.id === currentTask.id) {
                runningTask = task;
              }
              if (runningTask == task && (task.status === 'SUCCESS' || task.status === 'FAILURE')) {
                if (task.status === 'SUCCESS') {
                  store.commit('SET_PROGRESS', 100.0);
                } else if (task.status === 'FAILURE') {
                  if (task.metadata && task.metadata.error) {
                    store.commit('SET_CURRENT_TASK_ERROR', task.metadata.error);
                  }
                }
                let callbacks = store.getters.callbacks;
                if (callbacks && callbacks[task.id]) {
                  let callback = callbacks[task.id]['resolve'];
                  if (task.status === 'FAILURE') {
                    callback = callbacks[task.id]['reject'];
                  }
                  delete callbacks[task.id];
                  if (callback) {
                    callback();
                  }
                }

                // We add noDialog to the JSON data to override dialog handling. This
                // property only exists on the task that was passed in, so make sure
                // we check that by using currentTask rather than runningTask or task.
                if (currentTask.noDialog) {
                  store.dispatch('clearCurrentTask');
                }
              } else if (runningTask == task && currentTaskError) {
                // If the task is still running and an error was set, that means it was
                // an error during the polling process. This call means we are again
                // polling successfully, so clear the error.
                store.commit('SET_CURRENT_TASK_ERROR', null);
              }
            }
          }

          if (
            runningTask &&
            currentTask.is_progress_tracking &&
            runningTask.metadata.progress &&
            runningTask.metadata.progress >= 0.0
          ) {
            store.commit('SET_PROGRESS', runningTask.metadata.progress);
          }
          store.commit('SET_ASYNC_TASKS', data);
          // make sure we restart the timer only after the current task call completes
          // so that task calls do not stack.
          store.dispatch('activateTaskUpdateTimer');
        },
        error: function(error) {
          // if we can't get task status, there is likely a server failure of some sort,
          // so assume the task failed and report that.
          let currentTask = store.getters.currentTask;
          let callbacks = store.getters.callbacks;
          store.commit('SET_CURRENT_TASK_ERROR', error);
          if (currentTask) {
            if (callbacks[currentTask.id] && callbacks[currentTask.id]['reject']) {
              callbacks[currentTask.id]['reject'](error);
            }
          }
          // make sure we restart the timer only after the current task call completes
          // so that task calls do not stack.
          store.dispatch('activateTaskUpdateTimer');
        },
      });
    },
  },
  mutations: {
    SET_ASYNC_TASKS(state, asyncTasks) {
      state.asyncTasks = asyncTasks || [];
    },
    SET_CURRENT_TASK_ERROR(state, error) {
      state.currentTaskError = error;
    },
    SET_CURRENT_TASK(state, payload) {
      if (!payload || !payload.task || !payload.task.id) {
        state.currentTask = null;
        return;
      }
      state.currentTask = payload.task;
      let resolveCallback = payload.resolveCallback;
      let rejectCallback = payload.rejectCallback;
      if (payload.task && (resolveCallback || rejectCallback)) {
        state.callbacks[payload.task.id] = { resolve: resolveCallback, reject: rejectCallback };
      }
    },
    SET_PROGRESS(state, percent) {
      state.progressPercent = Math.min(100, percent);
    },
  },
};

module.exports = asyncTasksModule;
