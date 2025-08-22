import { computed, onBeforeMount, ref, watch, unref } from 'vue';
import { useRouter, useRoute } from 'vue-router/composables';
import findKey from 'lodash/findKey';
import transform from 'lodash/transform';
import uniq from 'lodash/uniq';
import intersection from 'lodash/intersection';
import isEqual from 'lodash/isEqual';
import difference from 'lodash/difference';
import { debounce } from 'lodash';

function getBooleanVal(value) {
  return typeof value === 'string' ? value === 'true' : value;
}

function haveSameElements(arrayA, arrayB) {
  return isEqual(arrayA.sort(), arrayB.sort());
}

function useQueryParams() {
  const router = useRouter();

  function updateQueryParams(params) {
    const query = transform(
      params,
      (result, value, key) => {
        if (value !== null) {
          result[key] = value;
        }
      },
      {},
    );
    router.push({ query }).catch(error => {
      if (error && error.name != 'NavigationDuplicated') {
        throw error;
      }
    });
  }

  return { updateQueryParams };
}

export function useFilter(filterMap) {
  // The composable can accept both an object or a ref. We convert
  // it to a ref explicitly to be able to use in the same way
  // in both cases.
  const paramKeys = computed(() =>
    uniq(Object.values(unref(filterMap)).flatMap(f => Object.keys(f.params))),
  );

  const route = useRoute();
  const { updateQueryParams } = useQueryParams();

  const filter = computed({
    get() {
      // Return filter where all param conditions are met
      const queryKeys = Object.keys(route.query);
      const filterKeys = intersection(queryKeys, paramKeys.value);

      const key = findKey(unref(filterMap), (value, key) => {
        const requiredFilterKeys = Object.keys(unref(filterMap)[key].params);
        if (!haveSameElements(filterKeys, requiredFilterKeys)) {
          return false;
        }

        return filterKeys.every(field => {
          const expected = value.params[field];
          const provided = route.query[field];

          if (typeof expected === 'boolean') {
            return expected === getBooleanVal(provided);
          } else {
            return expected === provided;
          }
        });
      });

      return key ? key : null;
    },
    set(value) {
      // Get params that aren't part of the filterMap
      const queryKeys = Object.keys(route.query);
      const otherFilterKeys = difference(queryKeys, paramKeys.value);
      const otherFilters = otherFilterKeys.reduce((result, key) => {
        result[key] = route.query[key];
        return result;
      }, {});

      const filterParams =
        value !== null && value !== undefined ? unref(filterMap)[value].params : {};

      // Set the router with the params from the filterMap and current route
      updateQueryParams({
        ...otherFilters,
        ...filterParams,
        page: 1,
      });
    },
  });

  const filters = computed(() => {
    return Object.entries(unref(filterMap)).map(([key, value]) => {
      return { key, label: value.label };
    });
  });

  return {
    filter,
    filters,
  };
}

export function useKeywordSearch() {
  const keywordInput = ref('');
  const route = useRoute();

  const { updateQueryParams } = useQueryParams();

  const keywords = computed({
    get() {
      return route.query.keywords || '';
    },
    set(value) {
      const params = { ...route.query, page: 1 };
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

  return {
    keywordInput,
    setKeywords,
    clearSearch,
  };
}
