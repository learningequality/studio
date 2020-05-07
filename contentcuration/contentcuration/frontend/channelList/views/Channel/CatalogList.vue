<template>

  <div>
    <CatalogFilters />
    <VContainer fluid>
      <CatalogFilterBar />
      <LoadingText v-if="loading" />
      <VLayout v-else grid wrap class="list-wrapper mt-4">
        <!-- Results bar -->
        <VFlex xs12>
          <h1 class="title ml-1">
            {{ $tr('resultsText', {count: page.count}) }}
          </h1>
          <VMenu offset-y>
            <template v-slot:activator="{ on }">
              <VBtn color="primary" v-on="on">
                {{ $tr('downloadChannelsReport') }}
                &nbsp;
                <Icon>arrow_drop_down</Icon>
              </VBtn>
            </template>
            <VList>
              <VListTile download @click="downloadCSV">
                <VListTileTitle>{{ $tr('downloadCSV' ) }}</VListTileTitle>
              </VListTile>
            </VList>
          </VMenu>
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
  import CatalogFilterBar from './CatalogFilterBar';
  import LoadingText from 'shared/views/LoadingText';
  import Pagination from 'shared/views/Pagination';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { channelExportMixin } from 'shared/views/channel/mixins';

  export default {
    name: 'CatalogList',
    components: {
      ChannelItem,
      LoadingText,
      CatalogFilters,
      Pagination,
      CatalogFilterBar,
    },
    mixins: [channelExportMixin, constantsTranslationMixin],
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
      downloadCSV() {
        this.$store.dispatch('showSnackbar', { text: this.$tr('downloadingCSV') });
        return this.downloadChannelsCSV(this.$route.query).then(csv => {
          let blob = new Blob([csv]);
          let downloadButton = document.createElement('a');
          downloadButton.href = window.URL.createObjectURL(blob, {
            type: 'text/csv',
          });
          downloadButton.target = '_blank';
          downloadButton.download = `${this.$tr('csvName')}.csv`;
          downloadButton.click();
        });
      },
    },
    $trs: {
      resultsText: '{count, plural,\n =1 {# result found}\n other {# results found}}',
      downloadChannelsReport: 'Download channel reports',
      downloadCSV: 'Download CSV',
      downloadingCSV: 'Downloading CSV...',
      csvName: 'Kolibri channels',
    },
  };

</script>
<style lang="less" scoped>

  .list-wrapper {
    max-width: 900px;
    margin: 0 auto;
  }

</style>
