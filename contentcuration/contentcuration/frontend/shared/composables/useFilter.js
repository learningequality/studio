import { computed, unref } from 'vue';
import { useRoute } from 'vue-router/composables';
import { useQueryParams } from './useQueryParams';

/**
 * @typedef {Object} UseFilterReturn
 * @property {import('vue').ComputedRef<{
 *   key: string, value: string, label: string
 * }>} filter Reactive settable filter value.
 * @property {import('vue').ComputedRef<
 *   Array<{key: string, value: string, label: string}>
 * >} options List of available options.
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
    get: () => {
      const routeFilter = route.query[name];
      const filterOption = options.value.find(option => option.value === routeFilter);
      return filterOption || {};
    },
    set: value => {
      updateQueryParams({
        ...route.query,
        // `value` is a KSelect option object with `key` and `value` properties
        // so we use `value.value` to get the actual filter value
        [name]: value.value || undefined,
      });
    },
  });

  const options = computed(() => {
    return Object.entries(unref(filterMap)).map(([key, value]) => {
      // Adding `key` and `value` properties for compatibility with KSelect and VSelect
      return { key, value: key, label: value.label };
    });
  });

  const fetchQueryParams = computed(() => {
    return unref(filterMap)[filter.value.value]?.params || {};
  });

  return {
    filter,
    options,
    fetchQueryParams,
  };
}
