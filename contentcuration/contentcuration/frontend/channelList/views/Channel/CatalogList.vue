<template>

  <div class="catalog-page-wrapper">
    <!-- Sidebar with fixed width -->
    <aside class="catalog-sidebar">
      <CatalogFilters />
    </aside>

    <!-- Main content takes remaining space -->
    <main class="catalog-main-content">
      <VSlideYTransition>
        <ToolBar
          v-show="offline"
          dense
          clipped-left
          absolute
        >
          <OfflineText />
        </ToolBar>
      </VSlideYTransition>
      <VContainer
        fluid
        :style="`margin-top: ${offline ? 48 : 0}`"
      >
        <LoadingText v-if="loading" />
        <VLayout
          v-else
          grid
          wrap
          class="list-wrapper"
        >
          <!-- Results bar -->
          <VFlex
            xs12
            class="mb-2"
          >
            <h1 class="mb-2 ml-1 title">
              {{ $tr('resultsText', { count: page.count }) }}
            </h1>
            <KButton
              v-if="page.count && !selecting"
              :text="$tr('selectChannels')"
              data-test="select"
              appearance="basic-link"
              @click="setSelection(true)"
            />
            <Checkbox
              v-else-if="selecting"
              v-model="selectAll"
              class="mb-4 mx-2"
              :label="$tr('selectAll')"
              data-test="select-all"
              :indeterminate="selected.length > 0 && selected.length < channels.length"
            />
          </VFlex>
          <VFlex xs12>
            <VLayout
              v-for="item in channels"
              :key="item.id"
              align-center
            >
              <Checkbox
                v-show="selecting"
                v-model="selected"
                class="mx-2"
                :value="item.id"
                data-test="checkbox"
              />
              <ChannelItem
                :channelId="item.id"
                :detailsRouteName="detailsRouteName"
                style="flex-grow: 1; width: 100%"
              />
            </VLayout>
          </VFlex>
          <VFlex
            xs12
            style="padding-bottom: 72px"
          >
            <VLayout justify-center>
              <Pagination
                :pageNumber="page.page_number"
                :totalPages="page.total_pages"
              />
            </VLayout>
          </VFlex>
        </VLayout>
        <BottomBar
          v-if="selecting"
          data-test="toolbar"
          :appearanceOverrides="{ height: isMobile ? '72px' : '56px' }"
        >
          <div class="mx-2">
            {{ $tr('channelSelectionCount', { count: selectedCount }) }}
          </div>
          <VSpacer />
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
            :primary="true"
            data-test="download-button"
            iconAfter="dropup"
          >
            <KDropdownMenu
              :primary="true"
              :options="[
                { label: $tr('downloadPDF'), value: 'pdf' },
                { label: $tr('downloadCSV'), value: 'csv' },
              ]"
              appearance="raised-button"
              @select="option => selectDownloadOption(option)"
            />
          </KButton>
        </BottomBar>
      </VContainer>
    </main>
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
  import ChannelItem from './ChannelItem';
  import LoadingText from 'shared/views/LoadingText';
  import Pagination from 'shared/views/Pagination';
  import BottomBar from 'shared/views/BottomBar';
  import Checkbox from 'shared/views/form/Checkbox';
  import ToolBar from 'shared/views/ToolBar';
  import OfflineText from 'shared/views/OfflineText';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { channelExportMixin } from 'shared/views/channel/mixins';

  export default {
    name: 'CatalogList',
    components: {
      ChannelItem,
      LoadingText,
      CatalogFilters,
      Pagination,
      BottomBar,
      Checkbox,
      ToolBar,
      OfflineText,
    },
    mixins: [channelExportMixin, constantsTranslationMixin],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();

      return {
        isMobile: windowIsSmall,
      };
    },
    data() {
      return {
        loading: true,
        loadError: false,
        selecting: false,

        /**
         * jayoshih: router guard makes it difficult to track
         * differences between previous query params and new
         * query params, so just track it manually
         */
        previousQuery: this.$route.query,

        /**
         * jayoshih: using excluded logic here instead of selected
         * to account for selections across pages (some channels
         * not in current page)
         */
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
            this.excluded.filter(id => !selected.includes(id)), // Remove selected items
            difference(this.page.results, selected), // Add non-selected items
          );
        },
      },
      debouncedSearch() {
        return debounce(this.loadCatalog, 1000);
      },
      detailsRouteName() {
        return RouteNames.CATALOG_DETAILS;
      },
      channels() {
        // Sort again by the same ordering used on the backend - name.
        // Have to do this because of how we are getting the object data via getChannels.
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

          // Reset selection mode if a filter is changed (ignore page)
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

  .catalog-page-wrapper {
    display: flex;
    flex-direction: row;
    min-height: 100vh;
  }

  .catalog-sidebar {
    flex-shrink: 0; // Prevent sidebar from shrinking
    width: 300px;
    overflow-y: auto; // Allow sidebar to scroll independently if needed
  }

  .catalog-main-content {
    flex: 1; // Takes remaining space
    min-width: 0; // Prevents flex item from overflowing
    overflow-y: auto; // Allow main content to scroll
  }

  .list-wrapper {
    max-width: 1080px;
    margin: 0 auto;
  }

  // Optional: Responsive behavior for mobile
  @media (max-width: 960px) {
    .catalog-page-wrapper {
      flex-direction: column;
    }

    .catalog-sidebar {
      width: 100%;
      max-height: 300px; // Limit height on mobile
    }
  }

</style>
