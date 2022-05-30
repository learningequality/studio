import Vue from 'vue';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';
import { Task } from 'shared/data/resources';

export default {
  namespaced: true,
  state() {
    return {
      asyncTasksMap: {},
    };
  },
  actions: {
    initState(store) {
      return Task.where().then(tasks => {
        for (let task of tasks) {
          store.commit('ADD_ASYNC_TASK', task);
        }
      });
    },
  },
  getters: {
    getAsyncTask(state) {
      return function(taskId) {
        return state.asyncTasksMap[taskId];
      };
    },
    getPublishTaskForChannel(state) {
      return function(channelId) {
        return Object.values(state.asyncTasksMap).find(t => t.channel_id.replace('-', '') === channelId && t.task_type === 'export-channel');
      }
    }
  },
  mutations: {
    ADD_ASYNC_TASK(state, task) {
      Vue.set(state.asyncTasksMap, task.task_id, task);
    },
    REMOVE_ASYNC_TASK(state, asyncTask) {
      Vue.delete(state.asyncTasksMap, asyncTask.task_id);
    },
  },
  listeners: {
    [TABLE_NAMES.TASK]: {
      [CHANGE_TYPES.CREATED]: 'ADD_ASYNC_TASK',
      [CHANGE_TYPES.UPDATED]: 'ADD_ASYNC_TASK',
      [CHANGE_TYPES.DELETED]: 'REMOVE_ASYNC_TASK',
    },
  },
};
