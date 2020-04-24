export const filterMixin = {
  methods: {
    updateQueryParams(params) {
      let query = Object.assign({}, this.$route.query);
      for (let [key, value] of Object.entries(params)) {
        if (value != null) {
          query[key] = value;
        } else {
          delete query[key];
        }
      }
      this.$router.push({ query });
    },
    search: function(search) {
      this.updateQueryParams({ search, page: 1 });
    },
    filter: function(filter) {
      this.updateQueryParams({ filter, page: 1 });
    },
    clearSearch: function() {
      this.updateQueryParams({ search: null });
    },
  },
};
