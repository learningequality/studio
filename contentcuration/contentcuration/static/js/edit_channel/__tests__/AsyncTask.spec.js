let State = require('../state');

let dummyTasks = [
  {
    id: 1,
    task_id: 'celery1',
  },
  {
    id: 2,
    task_id: 'celery2',
  },
];

describe('AsyncTask', () => {
  it('should get the currently set tasks when asyncTasks is accessed', done => {
    State.Store.commit('SET_ASYNC_TASKS', dummyTasks);
    let tasks = State.Store.getters.asyncTasks;

    expect(tasks).toEqual(dummyTasks);
    done();
  });
});
