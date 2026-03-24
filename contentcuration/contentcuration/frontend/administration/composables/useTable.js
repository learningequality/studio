import pickBy from 'lodash/pickBy';
import isEqual from 'lodash/isEqual';
import { ref, computed, unref, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router/composables';
import { useQueryParams } from 'shared/composables/useQueryParams';

/**
 * @typedef {Object} Pagination
 * @property {number} rowsPerPage Number of items per page.
 * @property {number} page Current page number.
 * @property {boolean} [descending] Whether the sorting is descending.
 * @property {string} [sortBy] Field to sort by.
 */

/**
 * @typedef {Object} UseTableReturn
 * @property {import('vue').ComputedRef<Pagination>} pagination Reactive pagination settings.
 * @property {import('vue').Ref<boolean>} loading Whether data is currently being loaded.
 */

/**
 *
 * @param {Object} params
 * @param {function} params.fetchFunc Function to fetch data, should return a Promise.
 * @param {import('vue').ComputedRef<Object>|object} params.filterFetchQueryParams
 * Backend fetch query parameters based on applied filters.
 * @returns {UseTableReturn}
 */
export function useTable({ fetchFunc, filterFetchQueryParams }) {
  const route = useRoute();
  const { updateQueryParams } = useQueryParams();

  const loading = ref(false);

  const pagination = computed({
    get() {
      const params = {
        rowsPerPage: Number(route.query.page_size) || 25,
        page: Number(route.query.page) || 1,
      };
      // Add descending if it's in the route query params
      if (route.query.descending !== undefined && route.query.descending !== null) {
        params.descending = route.query.descending.toString() === 'true';
      }
      // Add sortBy if it's in the route query params
      if (route.query.sortBy) {
        params.sortBy = route.query.sortBy;
      }

      return params;
    },
    set(newPagination) {
      // Removes null pagination parameters from the URL
      const newQuery = pickBy(
        {
          ...route.query,
          page_size: newPagination.rowsPerPage,
          ...newPagination,
        },
        (value, key) => {
          return value !== null && key !== 'rowsPerPage' && key !== 'totalItems';
        },
      );

      updateQueryParams(newQuery);
    },
  });

  const paginationFetchParams = computed(() => {
    const params = {
      page: pagination.value.page,
      page_size: pagination.value.rowsPerPage,
    };
    if (pagination.value.sortBy) {
      params.ordering = (pagination.value.descending ? '-' : '') + pagination.value.sortBy;
    }

    return params;
  });

  const allFetchQueryParams = computed(() => {
    return {
      ...unref(filterFetchQueryParams),
      ...paginationFetchParams.value,
    };
  });

  function loadItems() {
    loading.value = true;
    fetchFunc(allFetchQueryParams.value).then(() => {
      loading.value = false;
    });
  }

  watch(filterFetchQueryParams, (newValue, oldValue) => {
    if (!isEqual(newValue, oldValue)) {
      pagination.value = { ...pagination.value, page: 1 };
    }
  });

  watch(
    allFetchQueryParams,
    (newValue, oldValue) => {
      if (isEqual(newValue, oldValue)) {
        return;
      }
      // Use nextTick to ensure that pagination can be updated before fetching
      nextTick().then(() => {
        loadItems();
      });
    },
    { immediate: true },
  );

  return {
    pagination,
    loading,
  };
}
