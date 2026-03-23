import { computed, inject, provide } from 'vue';
import { useFilter } from 'shared/composables/useFilter';
import { useKeywordSearch } from 'shared/composables/useKeywordSearch';
import countriesUtil from 'shared/utils/countries';
import { currentLanguage } from 'shared/i18n';
import { LanguagesList } from 'shared/leUtils/Languages';
import { getSortedCategories } from 'shared/utils/helpers';
import { translateMetadataString } from 'shared/utils/metadataStringsTranslation';

const COUNTRIES_FILTER = Symbol('countriesFilter');
const COUNTRIES_OPTIONS = Symbol('countriesOptions');
const LANGUAGES_FILTER = Symbol('languagesFilter');
const LANGUAGE_OPTIONS = Symbol('languageOptions');
const CATEGORIES_FILTER = Symbol('categoriesFilter');
const CATEGORY_OPTIONS = Symbol('categoryOptions');
const KEYWORD_INPUT = Symbol('keywordInput');
const SET_KEYWORDS = Symbol('setKeywords');
const FILTERS_QUERY_PARAMS = Symbol('filtersQueryParams');
const REMOVE_FILTER_VALUE = Symbol('removeFilterValue');
const CLEAR_SEARCH = Symbol('clearSearch');

export default function useCommunityChannelsFilters() {
  const countryFilterMap = computed(() => {
    const [lang] = currentLanguage.split('-');
    const allCountries = countriesUtil.getNames(lang);
    return Object.fromEntries(
      Object.entries(allCountries).map(([code, name]) => [
        code,
        {
          label: name,
          params: { countries: code },
        },
      ]),
    );
  });

  const languageFilterMap = computed(() => {
    return Object.fromEntries(
      LanguagesList.map(lang => [
        lang.id,
        {
          label: lang.readable_name,
          params: { languages: lang.id },
        },
      ]),
    );
  });

  const categoryFilterMap = computed(() => {
    const sortedCategories = getSortedCategories();
    return Object.fromEntries(
      Object.entries(sortedCategories).map(([value, name]) => [
        value,
        {
          label: translateMetadataString(name),
          params: { categories: value },
        },
      ]),
    );
  });

  const {
    filter: countriesFilter,
    options: countryOptions,
    fetchQueryParams: countriesFetchQueryParams,
  } = useFilter({ name: 'countries', filterMap: countryFilterMap, multi: true });

  const {
    filter: languagesFilter,
    options: _languageOptions,
    fetchQueryParams: languagesFetchQueryParams,
  } = useFilter({ name: 'languages', filterMap: languageFilterMap, multi: true });

  const languageOptions = computed(() => {
    // Sort language options alphabetically by label
    return _languageOptions.value.sort((a, b) => a.label.localeCompare(b.label));
  });

  const {
    filter: categoriesFilter,
    options: categoryOptions,
    fetchQueryParams: categoriesFetchQueryParams,
  } = useFilter({ name: 'categories', filterMap: categoryFilterMap, multi: true });

  const {
    keywordInput,
    setKeywords,
    clearSearch,
    fetchQueryParams: keywordSearchFetchQueryParams,
  } = useKeywordSearch({ name: 'search', queryParam: 'search' });

  const filtersQueryParams = computed(() => ({
    ...countriesFetchQueryParams.value,
    ...languagesFetchQueryParams.value,
    ...categoriesFetchQueryParams.value,
    ...keywordSearchFetchQueryParams.value,
  }));

  const removeFilterValue = (filter, valueToRemove) => {
    const newValue = filter.value.filter(option => option.value !== valueToRemove);
    filter.value = newValue;
  };

  provide(COUNTRIES_FILTER, countriesFilter);
  provide(COUNTRIES_OPTIONS, countryOptions);
  provide(LANGUAGES_FILTER, languagesFilter);
  provide(LANGUAGE_OPTIONS, languageOptions);
  provide(CATEGORIES_FILTER, categoriesFilter);
  provide(CATEGORY_OPTIONS, categoryOptions);
  provide(KEYWORD_INPUT, keywordInput);
  provide(SET_KEYWORDS, setKeywords);
  provide(FILTERS_QUERY_PARAMS, filtersQueryParams);
  provide(REMOVE_FILTER_VALUE, removeFilterValue);
  provide(CLEAR_SEARCH, clearSearch);

  return {
    countriesFilter,
    countryOptions,
    languagesFilter,
    languageOptions,
    categoriesFilter,
    categoryOptions,
    keywordInput,
    setKeywords,
    clearSearch,
    filtersQueryParams,
    removeFilterValue,
  };
}

export const injectCommunityChannelsFilters = () => {
  const countriesFilter = inject(COUNTRIES_FILTER);
  const countryOptions = inject(COUNTRIES_OPTIONS);
  const languagesFilter = inject(LANGUAGES_FILTER);
  const languageOptions = inject(LANGUAGE_OPTIONS);
  const categoriesFilter = inject(CATEGORIES_FILTER);
  const categoryOptions = inject(CATEGORY_OPTIONS);
  const keywordInput = inject(KEYWORD_INPUT);
  const setKeywords = inject(SET_KEYWORDS);
  const clearSearch = inject(CLEAR_SEARCH);
  const filtersQueryParams = inject(FILTERS_QUERY_PARAMS);
  const removeFilterValue = inject(REMOVE_FILTER_VALUE);

  return {
    countriesFilter,
    countryOptions,
    languagesFilter,
    languageOptions,
    categoriesFilter,
    categoryOptions,
    keywordInput,
    setKeywords,
    clearSearch,
    filtersQueryParams,
    removeFilterValue,
  };
};
