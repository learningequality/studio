import { debounce } from 'lodash';
import { ref, computed, onBeforeMount, watch } from 'vue';
import { useRoute } from 'vue-router/composables';
import { useQueryParams } from './useQueryParams';

/**
 * @typedef {Object} UseKeywordSearchReturn
 * @property {import('vue').Ref<string>} keywordInput
 * The current value of the search input.
 * @property {import('vue').ComputedRef<function>} setKeywords
 * Function to update the keywords based on input, debounced.
 * @property {function} clearSearch
 * Function to clear the search input.
 * @property {import('vue').ComputedRef<Object>} fetchQueryParams
 * Reactive backend fetch query parameters based on the keywords.
 */

/**
 * Composable for managing the state keyword search input. The search input
 * value is synchronized with a URL query parameter named `keywords`.
 * Parameters that should be added to the backend fetch params are
 * returned as `fetchQueryParams`.
 * @returns {UseKeywordSearchReturn}
 */
export function useKeywordSearch() {
  const keywordInput = ref('');
  const route = useRoute();

  const { updateQueryParams } = useQueryParams();

  const keywords = computed({
    get() {
      return route.query.keywords || '';
    },
    set(value) {
      const params = { ...route.query };
      if (value) {
        params.keywords = value;
      } else {
        delete params['keywords'];
      }
      updateQueryParams(params);
    },
  });

  function updateKeywords() {
    keywords.value = keywordInput.value;
  }
  const setKeywords = computed(() => {
    return debounce(updateKeywords, 500);
  });

  function clearSearch() {
    keywords.value = '';
  }

  onBeforeMount(() => {
    keywordInput.value = route.query.keywords;
  });

  watch(keywords, () => {
    keywordInput.value = keywords.value;
  });

  const fetchQueryParams = computed(() => {
    return keywords.value ? { keywords: keywords.value } : {};
  });

  return {
    keywordInput,
    setKeywords,
    clearSearch,
    fetchQueryParams,
  };
}
