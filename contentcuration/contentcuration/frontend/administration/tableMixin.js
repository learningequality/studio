import {
  paginationFromRoute,
  backendQueryFromPagination,
  queryFromPagination,
  minimizedQueryForRoute,
  backendQueryFromRoute,
  userLink,
  channelLink,
  searchUserEditableChannelsLink,
  searchChannelEditorsLink,
} from './router';

export default {
  data: () => ({
    pageWidth: window.innerWidth,
    pinnedColumnThresholdWidth: 700,
  }),
  computed: {
    syncPagination: {
      get() {
        return this.pagination;
      },
      set(pagination) {
        this.$router
          .push({
            query: queryFromPagination(pagination, this.$router.currentRoute.name),
            name: this.$router.currentRoute.name,
          })
          .catch(error => {
            if (error && error.name != 'NavigationDuplicated') {
              throw error;
            }
          });
      },
    },
    pinReferenceColumns() {
      return this.pageWidth > this.pinnedColumnThresholdWidth;
    },
    whilePinnedClass() {
      return this.pinReferenceColumns ? 'is-pinned' : '';
    },
    referenceColumns() {
      if (this.pinReferenceColumns) {
        return this.headers.slice(0, 1);
      } else {
        return [];
      }
    },
    mainColumns() {
      if (this.pinReferenceColumns) {
        return this.headers.slice(1);
      } else {
        return this.headers;
      }
    },
  },
  created() {
    this.fetch(backendQueryFromPagination(this.pagination));
  },
  mounted() {
    window.addEventListener('resize', () => {
      this.pageWidth = window.innerWidth;
    });
  },
  methods: {
    userLink,
    channelLink,
    searchUserEditableChannelsLink,
    searchChannelEditorsLink,
  },
  beforeRouteUpdate(to, from, next) {
    this.fetch(backendQueryFromRoute(to))
      .then(() => {
        this.pagination = paginationFromRoute(to);
        let minimizedQuery = minimizedQueryForRoute(to);
        if (minimizedQuery) {
          this.$router.replace({ query: minimizedQuery });
        }
        next();
      })
      .catch(error => {
        if (error && error.name != 'NavigationDuplicated') {
          throw error;
        }
      });
  },
};
