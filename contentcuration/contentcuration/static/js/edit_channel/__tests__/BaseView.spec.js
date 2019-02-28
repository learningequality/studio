const BaseViews = require("edit_channel/views");
const TreeEditViews = require("edit_channel/tree_edit/views");
const State = require("edit_channel/state");


function findAll(selector) {
  return document.querySelectorAll(selector);
}


describe('BaseView', () => {
  describe('loading modal', () => {
    it('should create a loading modal when show_loading_modal is called with a message', done => {
      let baseView = new BaseViews.BaseView();
      baseView.show_loading_modal("This dialog means something is taking time...");
      expect(findAll("#loading_modal").length).toBe(1);
      baseView.dismiss_loading_modal();
      done();
    })

    it('should not create a loading modal when show_loading_modal is called with an empty message', done => {
      let baseView = new BaseViews.BaseView();
      baseView.show_loading_modal("");
      expect(findAll("#loading_modal").length).toBe(0);
      done();
    })

    it('should create and dismiss a loading modal when display_load is called with a message and callback succeeds', done => {
      let baseView = new BaseViews.BaseView();
      let callback = jasmine.createSpy('callback').and.callFake(function(resolve, reject) {
        expect(findAll("#loading_modal").length).toBe(1);
        resolve(true);
        expect(findAll("#loading_modal").length).toBe(0);
      });
      baseView.display_load("This dialog means something is taking time...", callback);
      expect(callback).toHaveBeenCalled();
      done();
    })

    it('should show a loading modal when tasks are running', done => {
      let baseView = new BaseViews.BaseView();
      baseView.state_changed = baseView.state_changed.bind(baseView);
      State.Store.subscribe(baseView.state_changed);

      expect(findAll("#loading_modal").length).toBe(0);
      State.Store.commit('SET_ASYNC_TASKS', [{'id': 1, 'task_id': 'celery1'}]);
      // no running tasks, so no modal
      expect(findAll("#loading_modal").length).toBe(0);

      State.Store.commit('SET_RUNNING_TASKS', [{'id': 1, 'task_id': 'celery1', 'status': 'STARTED'}]);
      expect(findAll("#loading_modal").length).toBe(1);
      State.Store.commit('SET_RUNNING_TASKS', []);
      expect(findAll("#loading_modal").length).toBe(0);
      done();

    })
  })
})
