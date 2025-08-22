import pickBy from 'lodash/pickBy';

export const tableMixin = {
  data() {
    return {
      loading: false,
    };
  },
  computed: {
    pagination: {
      get() {
        const params = {
          rowsPerPage: Number(this.$route.query.page_size) || 25,
          page: Number(this.$route.query.page) || 1,
        };
        // Add descending if it's in the route query params
        if (this.$route.query.descending !== undefined && this.$route.query.descending !== null) {
          params.descending = this.$route.query.descending.toString() === 'true';
        }
        // Add sortBy if it's in the route query params
        if (this.$route.query.sortBy) {
          params.sortBy = this.$route.query.sortBy;
        }

        return params;
      },
      set(pagination) {
        // Removes null pagination parameters from the URL
        const newQuery = pickBy(
          {
            ...this.$route.query,
            page_size: pagination.rowsPerPage,
            ...pagination,
          },
          (value, key) => {
            return value !== null && key !== 'rowsPerPage' && key !== 'totalItems';
          },
        );

        this.$router
          .replace({
            ...this.$route,
            query: newQuery,
          })
          .catch(error => {
            if (error && error.name != 'NavigationDuplicated') {
              throw error;
            }
          });
      },
    },
    fetchParams() {
      const params = {
        ...this.$route.query,
      };
      if (params.sortBy) {
        params.ordering = (String(params.descending) === 'true' ? '-' : '') + params.sortBy;
        delete params.sortBy;
        delete params.descending;
      }
      return params;
    },
  },
  watch: {
    '$route.query'() {
      this._loadItems();
    },
  },
  mounted() {
    this._loadItems();
  },
  methods: {
    _loadItems() {
      this.loading = true;
      this.fetch(this.fetchParams).then(() => {
        this.loading = false;
      });
    },
    fetch() {
      throw Error('Must implement fetch method if using tableMixin');
    },
  },
};
