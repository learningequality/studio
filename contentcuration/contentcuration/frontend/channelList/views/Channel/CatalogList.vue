<template>

  <div>
    <CatalogFilters />
    <VContainer fluid>
      <LoadingText v-if="loading" />
      <VLayout v-else grid wrap class="list-wrapper">
        <VFlex xs12>
          <p class="title">
            {{ $tr('resultsText', {count: page.count}) }}
          </p>
        </VFlex>
        <VFlex xs12>
          <ChannelItem
            v-for="item in channels"
            :key="item.id"
            :channelId="item.id"
            :detailsRouteName="detailsRouteName"
          />
        </VFlex>
        <VFlex xs12>
          <VLayout justify-center>
            <Pagination
              :pageNumber="page.page_number"
              :totalPages="page.total_pages"
            />
          </VLayout>
        </VFlex>
      </VLayout>
    </VContainer>
    <keep-alive>
      <router-view v-if="$route.params.channelId" :key="$route.params.channelId" />
    </keep-alive>
  </div>

</template>

<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import debounce from 'lodash/debounce';
  import isEqual from 'lodash/isEqual';
  import { RouterNames } from '../../constants';
  import ChannelItem from './ChannelItem';
  import CatalogFilters from './CatalogFilters';
  import LoadingText from 'shared/views/LoadingText';
  import Pagination from 'shared/views/Pagination';

  export default {
    name: 'CatalogList',
    components: {
      ChannelItem,
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
      ...mapGetters('channel', ['getChannels']),
      ...mapState('channelList', ['page']),
      debouncedSearch() {
        return debounce(this.loadCatalog, 1000);
      },
      detailsRouteName() {
        return RouterNames.CATALOG_DETAILS;
      },
      channels() {
        return this.getChannels(this.page.results);
      },
    },
    watch: {
      $route(to, from) {
        if (!isEqual(to.query, from.query) && to.name === RouterNames.CATALOG_ITEMS) {
          this.loading = true;
          this.debouncedSearch();
        }
      },
    },
    mounted() {
      this.loadCatalog();
    },
    methods: {
      ...mapActions('channelList', ['searchCatalog']),
      loadCatalog() {
        this.loading = true;
        let params = {
          ...this.$route.query,
        };
        delete params['query_id'];
        return this.searchCatalog(params)
          .then(() => {
            this.loading = false;
          })
          .catch(() => {
            this.loadError = true;
            this.loading = false;
          });
      },
    },
    $trs: {
      resultsText: '{count, plural,\n =1 {# result found}\n other {# results found}}',
    },
  };

</script>
<style lang="less" scoped>

  .list-wrapper {
    max-width: 900px;
    margin: 0 auto;
  }

</style>
