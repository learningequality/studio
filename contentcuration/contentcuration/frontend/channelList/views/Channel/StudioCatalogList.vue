<template>

  <div>
    <CatalogFilters />
    <ToolBar
      v-show="offline"
      dense
      clipped-left
      absolute
    >
      <OfflineText />
    </ToolBar>
    <div
      class="catalog-content"
      :style="{ marginTop: offline ? '48px' : '0', padding: windowIsSmall ? '0' : '16px' }"
    >
      <LoadingText v-if="loading" />
      <div
        v-else
        class="list-wrapper"
      >
        <div class="results-header">
          <h1 class="results-title">
            {{ $tr('resultsText', { count: page.count }) }}
          </h1>
        </div>
        <div class="selection-controls">
          <KButton
            v-if="page.count && !selecting"
            :text="$tr('selectChannels')"
            data-test="select"
            appearance="basic-link"
            @click="setSelection(true)"
          />
          <KCheckbox
            v-else-if="selecting"
            :checked="selectAll"
            :indeterminate="isIndeterminate"
            :label="$tr('selectAll')"
            data-test="select-all"
            @change="toggleSelectAll"
          />
        </div>

        <KCardGrid
          layout="1-1-1"
          :skeletonsConfig="[
            {
              breakpoints: [0, 1, 2, 3, 4, 5, 6, 7],
              orientation: 'vertical',
              count: 3,
            },
          ]"
        >
          <StudioChannelCard
            v-for="channel in channels"
            :key="channel.id"
            :channel="channel"
            :selectable="selecting"
            :selected="isChannelSelected(channel.id)"
            @toggle-selection="handleSelectionToggle"
          />
        </KCardGrid>

        <!-- Pagination -->
        <div class="pagination-wrapper">
          <Pagination
            :pageNumber="page.page_number"
            :totalPages="page.total_pages"
          />
        </div>
      </div>
    </div>

    <BottomBar
      v-if="selecting"
      data-test="toolbar"
    >
      <div>
        {{ $tr('channelSelectionCount', { count: selectedCount }) }}
      </div>
      <div class="spacer"></div>
      <div>
        <KButton
          :text="$tr('cancelButton')"
          data-test="cancel"
          appearance="flat-button"
          @click="setSelection(false)"
        />
      </div>
      <KButton
        :text="$tr('downloadButton')"
        primary
        data-test="download-button"
        iconAfter="dropup"
      >
        <template #menu>
          <KDropdownMenu
            primary
            :options="[
              { label: $tr('downloadPDF'), value: 'pdf' },
              { label: $tr('downloadCSV'), value: 'csv' },
            ]"
            appearance="raised-button"
            @select="selectDownloadOption"
          />
        </template>
      </KButton>
    </BottomBar>
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import debounce from 'lodash/debounce';
  import difference from 'lodash/difference';
  import isEqual from 'lodash/isEqual';
  import sortBy from 'lodash/sortBy';
  import union from 'lodash/union';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { RouteNames } from '../../constants';
  import CatalogFilters from './CatalogFilters';
  import StudioChannelCard from './components/StudioChannelCard';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { channelExportMixin } from 'shared/views/channel/mixins';
  import BottomBar from 'shared/views/BottomBar';
  import LoadingText from 'shared/views/LoadingText';
  import OfflineText from 'shared/views/OfflineText';
  import Pagination from 'shared/views/Pagination';
  import ToolBar from 'shared/views/ToolBar';

  export default {
    name: 'StudioCatalogList',
    components: {
      StudioChannelCard,
      LoadingText,
      CatalogFilters,
      Pagination,
      BottomBar,
      ToolBar,
      OfflineText,
    },
    mixins: [channelExportMixin, constantsTranslationMixin],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    data() {
      return {
        loading: true,
        loadError: false,
        selecting: false,
        previousQuery: this.$route.query,
        excluded: [],
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannels']),
      ...mapState('channelList', ['page']),
      ...mapState({
        offline: state => !state.connection.online,
      }),
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
            this.excluded.filter(id => !selected.includes(id)),
            difference(this.page.results, selected),
          );
        },
      },
      isIndeterminate() {
        return this.selected.length > 0 && this.selected.length < this.channels.length;
      },
      debouncedSearch() {
        return debounce(this.loadCatalog, 1000);
      },
      channels() {
        return sortBy(this.getChannels(this.page.results), 'name');
      },
      selectedCount() {
        return this.page.count - this.excluded.length;
      },
    },
    watch: {
      $route(to) {
        if (!isEqual(to.query, this.previousQuery) && to.name === RouteNames.CATALOG_ITEMS) {
          this.loading = true;
          this.debouncedSearch();

          const ignoreDefaults = { page: 0 };
          const toQuery = { ...to.query, ...ignoreDefaults };
          const fromQuery = { ...this.previousQuery, ...ignoreDefaults };
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
      isChannelSelected(channelId) {
        return this.selected.includes(channelId);
      },
      handleSelectionToggle(channelId) {
        const currentlySelected = this.selected;
        if (currentlySelected.includes(channelId)) {
          this.selected = currentlySelected.filter(id => id !== channelId);
        } else {
          this.selected = [...currentlySelected, channelId];
        }
      },
      toggleSelectAll() {
        this.selectAll = !this.selectAll;
      },
      loadCatalog() {
        this.loading = true;
        const params = {
          ...this.$route.query,
        };
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
        const params = {
          excluded: this.excluded.slice(0),
          ...this.$route.query,
        };
        this.setSelection(false);
        return this.downloadChannelsCSV(params);
      },
      downloadPDF() {
        this.$store.dispatch('showSnackbar', { text: this.$tr('downloadingMessage') });
        const params = {
          excluded: this.excluded.slice(0),
          ...this.$route.query,
        };
        this.setSelection(false);
        return this.downloadChannelsPDF(params);
      },
      selectDownloadOption(option) {
        if (option.value === 'pdf') {
          this.downloadPDF();
        } else if (option.value === 'csv') {
          this.downloadCSV();
        }
      },
    },
    $trs: {
      resultsText: '{count, plural,\n =1 {# result found}\n other {# results found}}',
      selectChannels: 'Download a summary of selected channels',
      cancelButton: 'Cancel',
      downloadButton: 'Download',
      downloadCSV: 'Download CSV',
      downloadPDF: 'Download PDF',
      downloadingMessage: 'Download started',
      channelSelectionCount:
        '{count, plural,\n =1 {# channel selected}\n other {# channels selected}}',
      selectAll: 'Select all',
    },
  };

</script>


<style lang="scss" scoped>

  .catalog-content {
    width: 100%;
  }

  .list-wrapper {
    max-width: 1080px;
    padding: 16px 0;
    margin: 0 auto;
  }

  .results-header {
    margin-bottom: 8px;
  }

  .results-title {
    margin: 0 0 0 4px;
    font-size: 24px;
    font-weight: bold;
  }

  .selection-controls {
    margin-bottom: 16px;
    margin-left: 8px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    padding: 16px 0 72px;
  }

  .spacer {
    flex: 1;
  }

</style>
