<template>

  <div
    class="catalog-page-wrapper"
    :class="{ 'catalog-page-wrapper--small': windowIsSmall }"
  >
    <aside
      class="catalog-sidebar"
      :class="{ 'catalog-sidebar--small': windowIsSmall }"
    >
      <CatalogFilters />
    </aside>
    <div class="catalog-main-content">
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
      <CatalogFilterBar />
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
          <VFlex
            xs12
            class="mb-2"
          >
            <h1 class="visuallyhidden">{{ $tr('title') }}</h1>
            <p class="mb-2 ml-1 title">
              {{ $tr('resultsText', { count: page.count }) }}
            </p>
            <KButton
              v-if="page.count && !selecting"
              :text="$tr('selectChannels')"
              appearance="basic-link"
              @click="setSelection(true)"
            />
            <KCheckbox
              v-else-if="selecting"
              v-model="selectAll"
              :indeterminate="isIndeterminate"
              :label="$tr('selectAll')"
              class="mb-4 mx-2"
            />
          </VFlex>
          <VFlex xs12>
            <KCardGrid layout="1-1-1">
              <StudioChannelCard
                v-for="channel in channels"
                :key="channel.id"
                :channel="channel"
                :selectable="selecting"
                :selected="isChannelSelected(channel.id)"
                :to="getChannelDetailsRoute(channel.id)"
                :headingLevel="2"
                @toggle-selection="handleSelectionToggle"
              />
            </KCardGrid>
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
          :appearanceOverrides="{ height: windowIsSmall ? '72px' : '56px' }"
        >
          <div class="mx-2">
            {{ $tr('channelSelectionCount', { count: selectedCount }) }}
          </div>
          <VSpacer />
          <div>
            <KButton
              :text="$tr('cancelButton')"
              appearance="flat-button"
              @click="setSelection(false)"
            />
          </div>
          <KButton
            :text="$tr('downloadButton')"
            :primary="true"
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
    </div>
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
  import CatalogFilterBar from './CatalogFilterBar';
  import StudioChannelCard from './StudioChannelCard';
  import LoadingText from 'shared/views/LoadingText';
  import Pagination from 'shared/views/Pagination';
  import BottomBar from 'shared/views/BottomBar';
  import ToolBar from 'shared/views/ToolBar';
  import OfflineText from 'shared/views/OfflineText';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { channelExportMixin } from 'shared/views/channel/mixins';

  export default {
    name: 'CatalogList',
    components: {
      StudioChannelCard,
      LoadingText,
      CatalogFilters,
      CatalogFilterBar,
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
      channels() {
        // Sort again by the same ordering used on the backend - name.
        // Have to do this because of how we are getting the object data via getChannels.
        return sortBy(this.getChannels(this.page.results), 'name');
      },
      selectedCount() {
        return this.page.count - this.excluded.length;
      },
      isIndeterminate() {
        return this.selected.length > 0 && this.selected.length < this.channels.length;
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
      getChannelDetailsRoute(channelId) {
        return {
          name: RouteNames.CATALOG_DETAILS,
          params: { channelId },
          query: {
            ...this.$route.query,
            last: this.$route.name,
          },
        };
      },
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
      title: 'Content library',
      resultsText: '{count, plural,\n =1 {# result found}\n other {# results found}}',
      selectChannels: 'Download a summary of selected channels',
      cancelButton: 'Cancel',
      downloadButton: 'Download',
      downloadCSV: 'Download CSV',
      downloadPDF: 'Download PDF', // Kevin demanded NO DOTS!!!
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
    height: 100%;
  }

  .catalog-sidebar {
    width: 300px;
  }

  .catalog-main-content {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow: auto;
  }

  .list-wrapper {
    max-width: 1080px;
    margin: 0 auto;
  }

  .catalog-page-wrapper--small {
    flex-direction: column;

    .catalog-main-content {
      // Let parent component to manage overflow in small mode
      overflow: visible;
    }
  }

  .catalog-sidebar--small {
    width: 100%;
  }

</style>
