import uniq from 'lodash/uniq';
import isArray from 'lodash/isArray';

export const catalogFilterMixin = {
  computed: {
    keywords: {
      get() {
        return this.$route.query.keywords;
      },
      set(value) {
        this.setQueryParam('keywords', value);
      },
    },
    languages: {
      get() {
        let languages = this.$route.query.languages;
        return languages ? languages.split(',') : [];
      },
      set(value) {
        this.setQueryParam('languages', value);
      },
    },
    licenses: {
      get() {
        let licenses = this.$route.query.licenses;
        return licenses ? licenses.split(',').map(Number) : [];
      },
      set(value) {
        this.setQueryParam('licenses', value);
      },
    },
    kinds: {
      get() {
        let kinds = this.$route.query.kinds;
        return kinds ? kinds.split(',') : [];
      },
      set(value) {
        this.setQueryParam('kinds', value);
      },
    },
    coach: {
      get() {
        return this.$route.query.coach;
      },
      set(value) {
        this.setQueryParam('coach', value);
      },
    },
    assessments: {
      get() {
        return this.$route.query.assessments;
      },
      set(value) {
        this.setQueryParam('assessments', value);
      },
    },
    subtitles: {
      get() {
        return this.$route.query.subtitles;
      },
      set(value) {
        this.setQueryParam('subtitles', value);
      },
    },
    bookmark: {
      get() {
        return this.$route.query.bookmark;
      },
      set(value) {
        this.setQueryParam('bookmark', value);
      },
    },
    collection: {
      get() {
        return this.$route.query.collection;
      },
      set(value) {
        this.setQueryParam('collection', value);
      },
    },
  },
  methods: {
    setQueryParam(field, value) {
      let params = Object.assign({}, { ...this.$route.query });
      if (isArray(value)) {
        value = uniq(value).join(',');
      }

      if (value) {
        params[field] = value;
      } else {
        delete params[field];
      }
      this.navigate(params);
    },
    clearFilters() {
      this.navigate({});
    },
    navigate(params) {
      this.$router.push({
        ...this.$route,
        query: {
          ...params,
          page: 1, // Make sure we're on page 1 for every new query
        },
      });
    },
  },
};
