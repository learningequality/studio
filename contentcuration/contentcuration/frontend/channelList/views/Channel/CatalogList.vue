<template>

  <div>
    <CatalogFilters />
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
      :class="$vuetify.breakpoint.xsOnly ? 'pa-0' : 'pa-4'"
      :style="`margin-top: ${offline ? 48 : 0}`"
    >
      <LoadingText v-if="loading" />
      <VLayout
        v-else
        grid
        wrap
        class="list-wrapper py-4"
      >
        <!-- Results bar -->
        <VFlex
          xs12
          class="mb-2"
        >
          <h1 class="mb-2 ml-1 title">
            {{ $tr('resultsText', { count: page.count }) }}
          </h1>
          <ActionLink
            v-if="page.count && !selecting"
            :text="$tr('selectChannels')"
            data-test="select"
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
              @show-channel-details="handleShowChannelDetails"
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
        :appearanceOverrides="{ height: $vuetify.breakpoint.xsOnly ? '72px' : '56px' }"
      >
        <div class="mx-2">
          {{ $tr('channelSelectionCount', { count: selectedCount }) }}
        </div>
        <VSpacer />
        <div>
          <VBtn
            flat
            data-test="cancel"
            class="ma-0"
            @click="setSelection(false)"
          >
            {{ $tr('cancelButton') }}
          </VBtn>
        </div>
        <BaseMenu top>
          <template #activator="{ on }">
            <VBtn
              color="primary"
              class="ma-0 mx-2"
              v-on="on"
            >
              {{ $tr('downloadButton') }}
              <Icon
                class="ml-1"
                icon="dropup"
                :color="$themeTokens.textInverted"
              />
            </VBtn>
          </template>
          <VList>
            <VListTile @click="downloadPDF">
              <VListTileTitle>{{ $tr('downloadPDF') }}</VListTileTitle>
            </VListTile>
            <VListTile
              data-test="download-csv"
              @click="downloadCSV"
            >
              <VListTileTitle>{{ $tr('downloadCSV') }}</VListTileTitle>
            </VListTile>
          </VList>
        </BaseMenu>
      </BottomBar>
    </VContainer>
    <transition
      name="backdrop"
      appear
    >
      <div
        v-if="showSidePanel"
        class="backdrop"
        @click="handleCloseSidePanel"
      ></div>
    </transition>
    <ChannelDetailsSidePanel
      v-if="showSidePanel"
      v-model="showSidePanel"
      :channelId="selectedChannelId"
      @close="handleCloseSidePanel"
    />
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import debounce from 'lodash/debounce';
  import difference from 'lodash/difference';
  import isEqual from 'lodash/isEqual';
  import sortBy from 'lodash/sortBy';
  import union from 'lodash/union';
  import { RouteNames } from '../../constants';
  import ChannelDetailsSidePanel from './ChannelDetailsSidePanel';
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
      ChannelDetailsSidePanel,
    },
    mixins: [channelExportMixin, constantsTranslationMixin],
    data() {
      return {
        loading: true,
        loadError: false,
        selecting: false,
        showSidePanel: false,
        selectedChannelId: null,
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
      handleShowChannelDetails(channelId) {
        this.showSidePanel = true;
        this.selectedChannelId = channelId;
      },
      handleCloseSidePanel() {
        this.showSidePanel = false;
        this.selectedChannelId = null;
      },
    },
    $trs: {
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

  .list-wrapper {
    max-width: 1080px;
    margin: 0 auto;
  }

  .backdrop {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 9;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    background-attachment: fixed;
  }

  .backdrop-enter {
    opacity: 0;
  }

  .backdrop-enter-to {
    opacity: 1;
  }

  .backdrop-enter-active {
    transition: opacity 0.2s ease-in-out;
  }

  .backdrop-leave {
    opacity: 1;
  }

  .backdrop-leave-to {
    opacity: 0;
  }

  .backdrop-leave-active {
    transition: opacity 0.2s ease-in-out;
  }

</style>
