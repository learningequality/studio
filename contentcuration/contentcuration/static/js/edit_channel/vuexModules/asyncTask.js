const DEFAULT_CHECK_INTERVAL = 2000;

let timerID = null;

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
    startTask(store, newTask, resolveCallback, rejectCallback) {
      let tasks = store.getters.asyncTasks;
      tasks.push(newTask);

      const payload = {
        task: newTask,
        resolveCallback: resolveCallback,
        rejectCallback: rejectCallback,
      };
      store.commit('SET_PROGRESS', 0.0);
      store.commit('SET_CURRENT_TASK', payload);
      // force an immediate update in case the timer isn't already running
      store.dispatch('updateTaskList');
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
      if (!timerID) {
        timerID = setInterval(function() {
          store.dispatch('updateTaskList');
        }, DEFAULT_CHECK_INTERVAL);
      }
      $.ajax({
        method: 'GET',
        url: '/api/task',
        dataType: 'json',
        success: function(data) {
          let currentTask = store.getters.currentTask;
          let runningTask = null;

          if (data && data.length > 0) {
            for (let i = 0; i < data.length; i++) {
              const task = data[i];
              // TODO: Figure out how to set currentTask upon page reload.
              if (currentTask && task.id === currentTask.id) {
                runningTask = task;
              }
              if (runningTask == task && (task.status === 'SUCCESS' || task.status === 'FAILURE')) {
                if (task.status === 'SUCCESS') {
                  store.commit('SET_PROGRESS', 100.0);
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
              }
            }
          }

          if (
            runningTask &&
            runningTask.metadata.progress &&
            runningTask.metadata.progress >= 0.0
          ) {
            store.commit('SET_PROGRESS', runningTask.metadata.progress);
          }
          store.commit('SET_ASYNC_TASKS', data);
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
      state.currentTask = payload.task;
      state.progressPercent = 0.0;
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
