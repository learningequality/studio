import { computed, onBeforeMount, ref, watch, unref, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router/composables';
import transform from 'lodash/transform';
import pickBy from 'lodash/pickBy';
import { debounce, isEqual } from 'lodash';

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
    () => {
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
