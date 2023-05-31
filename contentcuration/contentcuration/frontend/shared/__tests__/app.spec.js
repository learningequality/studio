import VueRouter from 'vue-router';

import startApp from '../app';
import { CURRENT_USER } from 'shared/data/constants';
import { Session } from 'shared/data/resources';
import { resetDB } from 'shared/data';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/data');

const router = new VueRouter();

const USER_1 = { id: 0 };
const USER_2 = { id: 1 };

describe('startApp', () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
    store = storeFactory();
  });

  afterEach(async () => {
    global.user = undefined;
    await Session.table.clear();
  });

  describe('for a guest', () => {
    beforeEach(() => {
      global.user = undefined;
    });

    describe('if there is no current user saved in a session', () => {
      beforeEach(async () => {
        const sessionTable = await Session.table.toArray();
        expect(sessionTable).toEqual([]);
      });

      it("the client database shouldn't be reset", async () => {
        await startApp({ router, store });
        expect(resetDB).not.toHaveBeenCalled();
      });
    });

    describe('if there is a current user saved in a session', () => {
      beforeEach(async () => {
        await Session.table.put({ ...USER_1, CURRENT_USER });

        const sessionTable = await Session.table.toArray();
        expect(sessionTable).toEqual([{ ...USER_1, CURRENT_USER }]);
      });

      it('the client database should be reset', async () => {
        await startApp({ router, store });
        expect(resetDB).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('for a regular user', () => {
    beforeEach(() => {
      global.user = USER_1;
    });

    describe('if there is no current user saved in a session', () => {
      beforeEach(async () => {
        const sessionTable = await Session.table.toArray();
        expect(sessionTable).toEqual([]);
      });

      it("the client database shouldn't be reset", async () => {
        await startApp({ router, store });
        expect(resetDB).not.toHaveBeenCalled();
      });
    });

    describe('if there is the same current user saved in a session', () => {
      beforeEach(async () => {
        await Session.table.put({ ...USER_1, CURRENT_USER });

        const sessionTable = await Session.table.toArray();
        expect(sessionTable).toEqual([{ ...USER_1, CURRENT_USER }]);
      });

      it("the client database shouldn't be reset", async () => {
        await startApp({ router, store });
        expect(resetDB).not.toHaveBeenCalled();
      });
    });

    describe('if there is a different current user saved in a session', () => {
      beforeEach(async () => {
        await Session.table.put({ ...USER_2, CURRENT_USER });

        const sessionTable = await Session.table.toArray();
        expect(sessionTable).toEqual([{ ...USER_2, CURRENT_USER }]);
      });

      it('the client database should be reset', async () => {
        await startApp({ router, store });
        expect(resetDB).toHaveBeenCalledTimes(1);
      });
    });
  });
});
