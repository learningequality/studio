<template>

  <div>
    <CatalogFilters />
    <VContainer fluid>
      <CatalogFilterBar />
      <LoadingText v-if="loading" />
      <VLayout v-else grid wrap class="list-wrapper mt-4">
        <!-- Results bar -->
        <VFlex xs12 class="mb-2">
          <h1 class="title ml-1 mb-2">
            {{ $tr('resultsText', {count: page.count}) }}
          </h1>
          <ActionLink
            v-if="page.count && !selecting"
            :text="$tr('selectChannels')"
            @click="setSelection(!selecting)"
          />
          <Checkbox
            v-else-if="selecting"
            v-model="selectAll"
            class="mb-4"
            :label="$tr('selectAll')"
            :indeterminate="0 < selected.length && selected.length < channels.length"
          />
        </VFlex>
        <VFlex xs12>
          <VLayout v-for="item in channels" :key="item.id" align-center>
            <Checkbox
              v-show="selecting"
              v-model="selected"
              class="mr-2"
              :value="item.id"
            />
            <ChannelItem
              :channelId="item.id"
              :detailsRouteName="detailsRouteName"
            />
          </VLayout>
        </VFlex>
        <VFlex xs12 style="padding-bottom: 72px;">
          <VLayout justify-center>
            <Pagination
              :pageNumber="page.page_number"
              :totalPages="page.total_pages"
            />
          </VLayout>
        </VFlex>
      </VLayout>
      <BottomToolBar v-if="selecting" clipped-left color="white" flat>
        <span>{{ $tr('channelSelectionCount', {count: selectedCount}) }}</span>
        <VSpacer />
        <VBtn flat @click="setSelection(false)">
          {{ $tr('cancelButton') }}
        </VBtn>
        <VMenu offset-y top>
          <template v-slot:activator="{ on }">
            <VBtn color="primary" v-on="on">
              {{ $tr('downloadButton') }}
              <Icon class="ml-1">
                arrow_drop_up
              </Icon>
            </VBtn>
          </template>
          <VList>
            <VListTile>
              <VListTileTitle>{{ $tr('downloadPDF') }}</VListTileTitle>
            </VListTile>
            <VListTile @click="downloadCSV">
              <VListTileTitle>{{ $tr('downloadCSV') }}</VListTileTitle>
            </VListTile>
          </VList>
        </VMenu>
      </BottomToolBar>
    </VContainer>
    <keep-alive>
      <router-view v-if="$route.params.channelId" :key="$route.params.channelId" />
    </keep-alive>
  </div>

</template>

<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import debounce from 'lodash/debounce';
  import difference from 'lodash/difference';
  import isEqual from 'lodash/isEqual';
  import union from 'lodash/union';
  import { RouterNames } from '../../constants';
  import ChannelItem from './ChannelItem';
  import CatalogFilters from './CatalogFilters';
  import CatalogFilterBar from './CatalogFilterBar';
  import LoadingText from 'shared/views/LoadingText';
  import Pagination from 'shared/views/Pagination';
  import BottomToolBar from 'shared/views/BottomToolBar';
  import Checkbox from 'shared/views/form/Checkbox';
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
      BottomToolBar,
      Checkbox,
    },
    mixins: [channelExportMixin, constantsTranslationMixin],
    data() {
      return {
        loading: true,
        loadError: false,
        selecting: false,

        /*
          jayoshih: router guard makes it difficult to track
            differences between previous query params and new
            query params, so just track it manually
        */
        previousQuery: this.$route.query,

        /*
          jayoshih: using excluded logic here instead of selected
            to account for selections across pages (some channels
            not in current page)
        */
        excluded: [],
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannels']),
      ...mapState('channelList', ['page']),
      selectAll: {
        get() {
          return this.selected.length === this.channels.length;
        },
        set(value) {
          this.selected = value ? this.page.results : [];
        },
      },
      selected: {
        get() {
          return difference(this.page.results, this.excluded);
        },
        set(selected) {
          this.excluded = union(
            this.excluded.filter(id => !selected.includes(id)), // Remove selected items
            difference(this.page.results, selected) // Add non-selected items
          );
        },
      },
      debouncedSearch() {
        return debounce(this.loadCatalog, 1000);
      },
      detailsRouteName() {
        return RouterNames.CATALOG_DETAILS;
      },
      channels() {
        return this.getChannels(this.page.results);
      },
      selectedCount() {
        return this.page.count - this.excluded.length;
      },
    },
    watch: {
      $route(to) {
        if (!isEqual(to.query, this.previousQuery) && to.name === RouterNames.CATALOG_ITEMS) {
          this.loading = true;
          this.debouncedSearch();

          // Reset selection mode if a filter is changed (ignore page/query_id)
          const ignoreDefaults = { page: 0, query_id: '' };
          let toQuery = { ...to.query, ...ignoreDefaults };
          let fromQuery = { ...this.previousQuery, ...ignoreDefaults };
          if (!isEqual(toQuery, fromQuery)) {
            this.setSelection(false);
          }
        }
        this.previousQuery = { ...to.query };
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
      setSelection(selecting) {
        this.selecting = selecting;
        if (!selecting) {
          this.excluded = [];
        }
      },
      downloadCSV() {
        this.$store.dispatch('showSnackbar', { text: this.$tr('downloadingMessage') });
        this.setSelection(false);
        return this.downloadChannelsCSV({
          excluded: this.excluded,
          ...this.$route.query,
        });
      },
    },
    $trs: {
      resultsText: '{count, plural,\n =1 {# result found}\n other {# results found}}',
      selectChannels: 'Download a summary of selected channels',
      cancelButton: 'Cancel',
      downloadButton: 'Download',
      downloadCSV: 'Download CSV', // Kevin demanded NO DOTS!!!
      downloadPDF: 'Download PDF',
      downloadingMessage: 'Download started',
      channelSelectionCount:
        '{count, plural,\n =1 {# channel selected}\n other {# channels selected}}',
      selectAll: 'Select all',
    },
  };

</script>
<style lang="less" scoped>

  .list-wrapper {
    max-width: 900px;
    margin: 0 auto;
  }

</style>
