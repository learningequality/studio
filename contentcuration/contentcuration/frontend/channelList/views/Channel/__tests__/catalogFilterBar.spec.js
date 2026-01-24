import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { factory } from '../../../store';
import router from '../../../router';
import CatalogFilterBar from '../CatalogFilterBar';
import Vue from 'vue';

Vue.use(Vuex);
Vue.use(VueRouter);

const collection = { id: 'test-collection' };

const query = {
  keywords: 'testing',
  languages: 'en,es',
  coach: true,
  collection: 'some-collection',
};

async function closeChipByText(user, text) {
  const chip = await screen.findByText(text);

  const closeButton = chip
    .closest('[data-test^="filter-chip"]')
    .querySelector('i');

  await user.click(closeButton);
}


function makeWrapper() {
  const store = factory();

  router
    .push({
      name: 'CHANNELS_EDITABLE',
      query,
    })
    .catch(() => {});

  return render(CatalogFilterBar, {
    // localVue,
    store,
    router,
    computed: {
      collections() {
        return [collection];
      },
    },
  });
}

describe('catalogFilterBar', () => {
  beforeEach(() => {
    router
      .push({
        name: 'CHANNELS_EDITABLE',
        query: { ...query },
      })
      .catch(() => {});
  });

  it('clear all button should remove all filters', async () => {
    const user = userEvent.setup();
    makeWrapper();

    await user.click(screen.getByTestId('clear'));

    await waitFor(() => {
      expect(router.currentRoute.query.keywords).toBeUndefined();
      expect(router.currentRoute.query.coach).toBeUndefined();
      expect(router.currentRoute.query.collection).toBeUndefined();
      expect(router.currentRoute.query.languages).toBeUndefined();
    });
  });

  it('removing text-based filter should remove it from the query', async () => {
    const user = userEvent.setup();
    makeWrapper();

    await closeChipByText(user, '"testing"');

    await waitFor(() => {
      expect(router.currentRoute.query.keywords).toBeUndefined();
      expect(router.currentRoute.query.coach).toBeTruthy();
      expect(router.currentRoute.query.collection).toBeTruthy();
      expect(router.currentRoute.query.languages).toBeTruthy();
    });
  });

  it('removing boolean-based filter should remove it from the query', async () => {
    const user = userEvent.setup();
    makeWrapper();

    await closeChipByText(user, 'Coach content');

    await waitFor(() => {
      expect(router.currentRoute.query.coach).toBeUndefined();
      expect(router.currentRoute.query.collection).toBeTruthy();
      expect(router.currentRoute.query.languages).toBeTruthy();
      expect(router.currentRoute.query.keywords).toBeTruthy();
    });
  });

  it('removing list-based filter should only remove that item from the query', async () => {
    const user = userEvent.setup();
    makeWrapper();
    await closeChipByText(user, 'English');

    await waitFor(() => {
      expect(router.currentRoute.query.languages).toBe('es');
    });

    await closeChipByText(user, 'Español');

    await waitFor(() => {
      expect(router.currentRoute.query.languages).toBeUndefined();
      expect(router.currentRoute.query.coach).toBeTruthy();
      expect(router.currentRoute.query.collection).toBeTruthy();
      expect(router.currentRoute.query.keywords).toBeTruthy();
    });
  });
});
