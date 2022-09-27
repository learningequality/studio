import Vue from 'vue';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';
import { Task } from 'shared/data/resources';
import { applyMods } from 'shared/data/applyRemoteChanges';

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
        return Object.values(state.asyncTasksMap).find(
          t => t.channel_id.replace('-', '') === channelId && t.task_name === 'export-channel'
        );
      };
    },
  },
  mutations: {
    ADD_ASYNC_TASK(state, task) {
      Vue.set(state.asyncTasksMap, task.task_id, task);
    },
    UPDATE_ASYNC_TASK_FROM_INDEXEDDB(state, { task_id, ...mods }) {
      if (task_id && state.asyncTasksMap[task_id]) {
        state.asyncTasksMap = {
          ...state.asyncTasksMap,
          [task_id]: applyMods(state.asyncTasksMap[task_id], mods),
        };
      }
    },
    REMOVE_ASYNC_TASK(state, asyncTask) {
      Vue.delete(state.asyncTasksMap, asyncTask.task_id);
    },
  },
  listeners: {
    [TABLE_NAMES.TASK]: {
      [CHANGE_TYPES.CREATED]: 'ADD_ASYNC_TASK',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_ASYNC_TASK_FROM_INDEXEDDB',
      [CHANGE_TYPES.DELETED]: 'REMOVE_ASYNC_TASK',
    },
  },
};
