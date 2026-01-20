import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { factory } from '../../../store';
import router from '../../../router';
import CatalogFilterBar from '../CatalogFilterBar';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const collection = { id: 'test-collection' };

const query = {
  keywords: 'testing',
  languages: 'en,es',
  coach: true,
  collection: 'some-collection',
};

function makeWrapper() {
  const store = factory();

  router.push({
    name: 'CHANNELS_EDITABLE',
    query,
  }).catch(() => {});

  return render(CatalogFilterBar, {
    localVue,
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
    router.push({
      name: 'CHANNELS_EDITABLE',
      query: { ...query },
    }).catch(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clear all button should remove all filters', async () => {
    const user = userEvent.setup();
    makeWrapper();

    const clearButton = await screen.findByText('Clear all');
    await user.click(clearButton);

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

    const testingChip = await screen.findByText('"testing"');
    const closeButton = testingChip.closest('.v-chip').querySelector('.v-chip__close');
    await user.click(closeButton);

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

    // Find the chip with "Coach content" text and click its close button
    const coachChip = await screen.findByText('Coach content');
    const coachCloseButton = coachChip.closest('.v-chip').querySelector('.v-chip__close');
    await user.click(coachCloseButton);

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

    const englishChip = await screen.findByText('English');
    const englishCloseButton = englishChip.closest('.v-chip').querySelector('.v-chip__close');
    await user.click(englishCloseButton);

    await waitFor(() => {
      expect(router.currentRoute.query.languages).toBe('es');
    });

    const espanolChip = await screen.findByText('Español');
    const espanolCloseButton = espanolChip.closest('.v-chip').querySelector('.v-chip__close');
    await user.click(espanolCloseButton);

    await waitFor(() => {
      expect(router.currentRoute.query.languages).toBeUndefined();
      expect(router.currentRoute.query.coach).toBeTruthy();
      expect(router.currentRoute.query.collection).toBeTruthy();
      expect(router.currentRoute.query.keywords).toBeTruthy();
    });
  });
});