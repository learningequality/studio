import pickBy from 'lodash/pickBy';
import { useRouter } from 'vue-router/composables';

/**
 * @typedef {Object} UseQueryParamsReturn
 * @property {function} updateQueryParams Function to update URL query parameters.
 */

/**
 * A composable handling updating URL query parameters while correctly
 * handling null values and avoiding `NavigationDuplicated` errors.
 *
 * @returns {UseQueryParamsReturn}
 */
export function useQueryParams() {
  const router = useRouter();

  /**
   * Updates URL query parameters, while correctly handling null values
   * and avoiding `NavigationDuplicated` errors.
   *
   * @param {Object} params - The new query parameters to set in the URL.
   */
  function updateQueryParams(params) {
    const query = pickBy(params, value => value !== null);
    router.push({ query }).catch(error => {
      if (error && error.name != 'NavigationDuplicated') {
        throw error;
      }
    });
  }

  return { updateQueryParams };
}
