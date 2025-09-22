import { computed, unref } from 'vue';
import { useRoute } from 'vue-router/composables';
import { useQueryParams } from './useQueryParams';

/**
 * @typedef {Object} UseFilterReturn
 * @property {import('vue').ComputedRef<string|undefined>} filter Reactive settable filter value.
 * @property {import('vue').ComputedRef<
 *   Array<{key: string, label: string}>
 * >} filters List of available filters.
 * @property {import('vue').ComputedRef<Object>} fetchQueryParams
 * Reactive fetch query parameters based on the selected filter.
 */

/**
 * Composable for managing the state of a single filter (like a dropdown).
 * The filter value is synchronized with a URL query parameter of the same name.
 * Parameters that should be added to the backend fetch params are determined
 * from the provided filterMap and returned as `fetchQueryParams`.
 *
 * The filterMap should be an object where keys are the possible filter values,
 * and values are objects with a `label` string (for display) and `params` (an object
 * with key-value pairs to add to fetch params when this filter is selected).
 *
 * Example filterMap:
 * {
 *  all: { label: 'All', params: {} },
 *  published: { label: 'Published', params: { published: true } },
 *  unpublished: { label: 'Unpublished', params: { published: false } },
 * }
 *
 * @param {Object} params The parameters for the filter.
 * @param {string} params.name The name of the filter used in query params.
 * @param {Object} params.filterMap A map of available filters.
 * @returns {UseFilterReturn}
 */
export function useFilter({ name, filterMap }) {
  const route = useRoute();
  const { updateQueryParams } = useQueryParams();

  const filter = computed({
    get: () => route.query[name] || undefined,
    set: value => {
      updateQueryParams({
        ...route.query,
        [name]: value || undefined,
      });
    },
  });

  const filters = computed(() => {
    return Object.entries(unref(filterMap)).map(([key, value]) => {
      return { key, label: value.label };
    });
  });

  const fetchQueryParams = computed(() => {
    return unref(filterMap)[filter.value]?.params || {};
  });

  return {
    filter,
    filters,
    fetchQueryParams,
  };
}
