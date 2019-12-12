<template>

  <div>
    <CatalogFilters />
    <v-container fluid class="list-wrapper">
      <LoadingText v-if="loading" />
      <v-layout v-else grid wrap>
        <v-flex xs12>
          <p class="title">
            {{ $tr('resultsText', {count: page.count}) }}
          </p>
        </v-flex>
        <v-flex xs12>
          <CatalogListItem v-for="item in page.results" :key="item.id" :itemID="item.id" />
        </v-flex>
        <v-flex xs12>
          <v-layout justify-center>
            <Pagination
              :pageNumber="page.page_number"
              :totalPages="page.total_pages"
              @input="navigateToPage"
            />
          </v-layout>
        </v-flex>
      </v-layout>
    </v-container>
    <keep-alive>
      <router-view v-if="$route.params.itemID" :key="$route.params.itemID" />
    </keep-alive>
  </div>

</template>

<script>

  import { mapActions, mapState } from 'vuex';
  import debounce from 'lodash/debounce';
  import isEqual from 'lodash/isEqual';
  import CatalogListItem from './CatalogListItem';
  import CatalogFilters from './CatalogFilters';
  import LoadingText from 'shared/views/LoadingText';
  import Pagination from 'shared/views/Pagination';

  export default {
    name: 'CatalogList',
    components: {
      CatalogListItem,
      LoadingText,
      CatalogFilters,
      Pagination,
    },
    data() {
      return {
        loading: true,
        loadError: false,
      };
    },
    computed: {
      ...mapState('catalog', ['page']),
      debouncedSearch() {
        return debounce(this.loadCatalog, 1000);
      },
    },
    watch: {
      $route(to, from) {
        if (!isEqual(to.query, from.query)) this.debouncedSearch();
      },
    },
    mounted() {
      this.loadCatalog();
    },
    methods: {
      ...mapActions('catalog', ['searchCatalog']),
      loadCatalog() {
        this.loading = true;
        return this.searchCatalog(this.$route.query)
          .then(() => {
            this.loading = false;
          })
          .catch(() => {
            this.loadError = true;
            this.loading = false;
          });
      },
      navigateToPage(page) {
        this.$router.push({
          ...this.$route,
          query: {
            ...this.$route.query,
            page_num: page,
          },
        });
      },
    },
    $trs: {
      resultsText: '{count, plural,\n =1 {# result found}\n other {# results found}}',
    },
  };

</script>
