let State = require('../state');
const ERROR_PRIMARY_MODAL_ALREADY_OPEN = require('../vuexModules/primaryModal')
  .ERROR_PRIMARY_MODAL_ALREADY_OPEN;
const BaseViews = require('edit_channel/views');

// a function that creates a BaseView
let makeModalView = () => new BaseViews.BaseView();

describe('ContentNodeCollection', () => {
  describe('usePrimaryModal action', () => {
    it('should call a function that sets up and returns a BaseView', done => {
      State.Store.commit('CLOSE_PRIMARY_MODAL');
      State.Store.dispatch('usePrimaryModal', makeModalView).then(modalView => {
        expect(modalView).toBeDefined();
        done();
      });
    });
    it('should not run the view setup function if a primary modal is already open', done => {
      State.Store.commit('OPEN_PRIMARY_MODAL', { name: 'dummyModal' });
      State.Store.dispatch('usePrimaryModal', makeModalView).catch(error => {
        expect(error.message).toBe(ERROR_PRIMARY_MODAL_ALREADY_OPEN('dummyModal'));
        done();
      });
    });
    it('should appropriately set `primaryModalInUse` as the modal view is created and removed', done => {
      // start out with the primary modal closed
      State.Store.commit('CLOSE_PRIMARY_MODAL');
      expect(State.Store.getters.primaryModalInUse).toBe(null);

      // create a primary modal
      State.Store.dispatch('usePrimaryModal', makeModalView).then(modalView => {
        expect(State.Store.getters.primaryModalInUse).toBe(modalView);

        // make sure we aren't allowed to create another primary modal
        State.Store.dispatch('usePrimaryModal', makeModalView).catch(error => {
          expect(error).toBeDefined();

          // remove the primary modal
          modalView.remove();
          expect(State.Store.getters.primaryModalInUse).toBe(null);

          // now we should be free to create another primary modal
          State.Store.dispatch('usePrimaryModal', makeModalView).then(anotherModalView => {
            expect(anotherModalView).toBeDefined();
            done();
          });
        });
      });
    });
  });
});
