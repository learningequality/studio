const DEFAULT_CHECK_INTERVAL = 5000;
const TASKS_RUNNING_CHECK_INTERVAL = 1000;

let timerID = null;

const asyncTasksModule = {
  state: {
    asyncTasks: [],
    runningTasks: [],
    finishedTasks: [],
  },
  getters: {
    asyncTasks(state) {
      return state.asyncTasks;
    },
    runningTasks(state) {
      return state.runningTasks;
    },
  },
  actions: {
    startTask(store, newTask) {
      if (timerID) {
        clearTimeout(timerID);
      }
      let tasks = store.getters.asyncTasks;
      tasks.push(newTask);
      store.dispatch('updateTaskList');
    },

    updateTaskList(store) {
      $.ajax({
        method: 'GET',
        url: '/api/task',
        dataType: 'json',
        success: function(data) {
          let runningTasks = [];
          // We re-construct the list of running tasks each time by checking the list, as some tasks
          // can run through the queue very quickly and skip certain statuses. This would cause
          // quirks where we didn't properly remove a finished task.
          let currentRunningTasks = store.getters.runningTasks;
          if (data && data.length > 0) {
            for (let i = 0; i < data.length; i++) {
              const task = data[i];
              const runningTask = currentRunningTasks.find(function(item) {
                return item.id === task.id;
              });
              if (task.status === 'STARTED') {
                runningTasks.push(task);
              } else if (task.status === 'SUCCESS' || task.status === 'FAILURE') {
                if (runningTask) {
                  store.commit('SET_TASK_FINISHED', task);
                }
              }
            }
          }

          // In order to not overly burden the server, we turn down the task check interval when
          // the user doesn't have any currently running tasks. When a task is started from the
          // UI, it will trigger this to update the check interval.
          let checkTimerInterval = DEFAULT_CHECK_INTERVAL;
          if (runningTasks.length > 0) {
            checkTimerInterval = TASKS_RUNNING_CHECK_INTERVAL;
          }
          timerID = setTimeout(function() {
            store.dispatch('updateTaskList');
          }, checkTimerInterval);
          store.commit('SET_ASYNC_TASKS', data);
          store.commit('SET_RUNNING_TASKS', runningTasks);
        },
      });
    },
  },
  mutations: {
    SET_ASYNC_TASKS(state, asyncTasks) {
      state.asyncTasks = asyncTasks || [];
    },
    SET_RUNNING_TASKS(state, runningTasks) {
      state.runningTasks = runningTasks || [];
    },
    SET_TASK_FINISHED(state, task) {
      state.finishedTasks.push(task);
    },
  },
};

module.exports = asyncTasksModule;
