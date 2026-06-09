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
 * @param {boolean} params.multi Whether multiple values can be selected.
 * @param {string|null} [params.defaultValue] Optional default value if query param is not set.
 * @returns {UseFilterReturn}
 */
export function useFilter({ name, filterMap, multi, defaultValue = null }) {
  const route = useRoute();
  const { updateQueryParams } = useQueryParams();

  const filter = computed({
    get: () => {
      const routeFilter = route.query[name];
      if (multi) {
        // For multi-select filters, we expect query param to be a comma-separated list of values
        const selectedValues = routeFilter ? routeFilter.split(',') : [];
        return options.value.filter(option => selectedValues.includes(option.value));
      } else {
        const filterOption = options.value.find(option => option.value === routeFilter);
        return filterOption || options.value.find(option => option.value === defaultValue) || {};
      }
    },
    set: value => {
      let valueToSet;
      if (multi) {
        // For multi-select, we need to join the selected values into a comma-separated string
        const selectedValues = value.map(option => option.value);
        valueToSet = selectedValues.join(',');
      } else {
        // `value` is a KSelect option object with `key` and `value` properties
        // so we use `value.value` to get the actual filter value
        valueToSet = value.value;
      }
      updateQueryParams({
        ...route.query,

        [name]: valueToSet || undefined,
      });
    },
  });

  const options = computed(() => {
    return Object.entries(unref(filterMap)).map(([key, value]) => {
      // Adding `key` and `value` properties for compatibility with KSelect and VSelect
      return { key, value: key, label: value.label };
    });
  });

  const unifyMultiParams = paramsList => {
    const resultParams = {};
    for (const params of paramsList) {
      for (const [key, value] of Object.entries(params)) {
        if (key in resultParams) {
          if (typeof value !== 'string') {
            throw new Error(
              'Multi-select filter params values must be strings to concatenate them with commas',
            );
          }
          resultParams[key] = `${resultParams[key]},${value}`;
        } else {
          resultParams[key] = value;
        }
      }
    }
    return resultParams;
  };

  const fetchQueryParams = computed(() => {
    const filterMapValue = unref(filterMap);
    if (multi) {
      const paramsList = [];
      for (const option of filter.value) {
        const optionParams = filterMapValue[option.value]?.params || {};
        paramsList.push(optionParams);
      }
      return unifyMultiParams(paramsList);
    }
    // `filter.value` is a KSelect option object with `key` and `value` properties
    // so we use `filter.value.value` to get the actual filter value
    return filterMapValue[filter.value.value]?.params || {};
  });

  return {
    filter,
    options,
    fetchQueryParams,
  };
}
