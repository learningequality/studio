<template>

  <div
    class="community-page-wrapper"
    :class="{ mobile: windowIsSmall }"
  >
    <aside
      class="community-sidebar"
      :class="{ mobile: windowIsSmall }"
    >
      <div class="community-filters-wrapper">
        <div
          v-if="!windowIsSmall"
          class="filter-panel"
          :style="asideStyles"
        >
          <CommunityLibraryFilters
            :disabled="loading"
            :style="{ padding: '16px' }"
          />
        </div>
      </div>
    </aside>

    <div class="community-main-content">
      <div class="content-container">
        <h1>
          {{ communityLibraryLabel$() }}
        </h1>
        <p>
          {{ communityLibraryDescription$() }}
          <KButton
            appearance="basic-link"
            @click="isAboutCommunityLibraryOpen = true"
          >
            {{ whatIsCommunityLibrary$() }}
          </KButton>
        </p>
        <AboutCommunityLibraryModal
          v-if="isAboutCommunityLibraryOpen"
          @close="isAboutCommunityLibraryOpen = false"
        />
        <template v-if="windowIsSmall">
          <KButton
            class="filter-button"
            :text="filterLabel$()"
            appearance="raised-button"
            icon="filter"
            @click="openSidePanel"
          />

          <SidePanelModal
            v-if="showFiltersSidePanel"
            alignment="left"
            @closePanel="closeSidePanel"
          >
            <template #header>
              <h2>{{ filterLabel$() }}</h2>
            </template>
            <template #default>
              <CommunityLibraryFilters :disabled="loading" />
            </template>
          </SidePanelModal>
        </template>
        <div v-if="activeFilters.length">
          <div class="active-filters">
            <StudioChip
              v-for="(filter, index) in activeFilters"
              :key="`community-filter-${index}`"
              :text="filter.text"
              close
              @close="filter.onclose"
            />
            <KButton
              class="clear-link"
              :text="clearAll$()"
              appearance="basic-link"
              @click="clearFilters"
            />
          </div>
        </div>
        <div class="list-wrapper">
          <div class="results-header">
            <p
              v-if="!loading"
              class="results-text"
            >
              {{ resultsText$({ count }) }}
            </p>
          </div>

          <div class="channels-grid">
            <KCardGrid
              layout="1-1-1"
              :loading="loading"
              :skeletonsConfig="skeletonsConfig"
              :syncCardsMetrics="false"
            >
              <StudioChannelCard
                v-for="channel in channels"
                :key="channel.id"
                :headingLevel="2"
                :orientation="windowBreakpoint > 2 ? 'horizontal' : 'vertical'"
                :showUpdateStatus="false"
                :channel="channel"
                :detailsRoute="getChannelDetailsRoute(channel)"
                @click="onCardClick(channel)"
              />
            </KCardGrid>
          </div>

          <div
            v-if="!loading && !channels.length && !loadError"
            class="empty-state"
          >
            {{ noResults$() }}
          </div>

          <div
            v-if="loadError"
            class="empty-state"
          >
            {{ loadError$() }}
          </div>

          <div
            v-if="!loading && totalPages > 1"
            class="pagination-container"
          >
            <Pagination :totalPages="totalPages" />
          </div>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import isEqual from 'lodash/isEqual';
  import { RouteNames, CHANNEL_PAGE_SIZE } from '../../../constants';
  import StudioChannelCard from '../StudioChannelCard';
  import CommunityLibraryFilters from './CommunityLibraryFilters';
  import useCommunityChannelsFilters from './useCommunityChannelsFilters';
  import AboutCommunityLibraryModal from './AboutCommunityLibraryModal.vue';
  import { listPublicChannels } from 'shared/data/public';
  import useStore from 'shared/composables/useStore';
  import StudioChip from 'shared/views/StudioChip';
  import Pagination from 'shared/views/Pagination';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import SidePanelModal from 'shared/views/SidePanelModal';

  function mapResponseChannel(channel) {
    const language = channel.lang_code || channel.included_languages?.[0] || null;
    return {
      ...channel,
      count: channel.total_resource_count || 0,
      language,
      thumbnail_url: channel.thumbnail,
      modified: channel.last_updated,
      last_published: channel.last_published || channel.last_updated,
    };
  }

  export default {
    name: 'CommunityLibraryList',
    components: {
      StudioChannelCard,
      CommunityLibraryFilters,
      StudioChip,
      Pagination,
      SidePanelModal,
      AboutCommunityLibraryModal,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const store = useStore();
      const tokensTheme = themeTokens();
      const { windowIsSmall, windowBreakpoint } = useKResponsiveWindow();

      const {
        filterLabel$,
        clearAll$,
        resultsText$,
        noResults$,
        loadError$,
        communityLibraryLabel$,
        communityLibraryDescription$,
        whatIsCommunityLibrary$,
      } = communityChannelsStrings;

      const {
        countriesFilter,
        categoriesFilter,
        languagesFilter,
        filtersQueryParams,
        keywordInput,
        clearSearch,
        removeFilterValue,
      } = useCommunityChannelsFilters();

      const loading = ref(false);
      const loadError = ref(false);
      const channels = ref([]);
      const showFiltersSidePanel = ref(false);
      const isAboutCommunityLibraryOpen = ref(false);
      const count = ref(0);
      const totalPages = ref(0);

      const currentPage = computed(() => Number(route.query.page) || 1);

      const asideStyles = computed(() => ({
        backgroundColor: tokensTheme.surface,
        borderRight: `1px solid ${tokensTheme.fineLine}`,
      }));

      const skeletonsConfig = [
        {
          breakpoints: [0, 1, 2, 3, 4, 5, 6, 7],
          count: 2,
          orientation: 'vertical',
          thumbnailDisplay: 'small',
          thumbnailAlign: 'left',
          thumbnailAspectRatio: '16:9',
          minHeight: '380px',
        },
        {
          breakpoints: [3, 4, 5, 6, 7],
          orientation: 'horizontal',
          minHeight: '230px',
        },
      ];
      const fetchQueryParams = computed(() => {
        return {
          public: false,
          page: currentPage.value,
          page_size: CHANNEL_PAGE_SIZE,
          ...filtersQueryParams.value,
        };
      });

      async function loadCommunityLibrary() {
        loading.value = true;
        loadError.value = false;
        try {
          const response = await listPublicChannels(fetchQueryParams.value);
          const results = response.results || [];
          channels.value = results.map(mapResponseChannel);
          count.value = response.count || 0;
          totalPages.value = response.total_pages || 1;
        } catch (error) {
          loadError.value = true;
          channels.value = [];
          count.value = 0;
          totalPages.value = 0;
          store.dispatch('errors/handleAxiosError', error);
        } finally {
          loading.value = false;
        }
      }

      const activeFilters = computed(() => {
        const active = [];

        if (keywordInput.value) {
          active.push({
            text: `"${keywordInput.value}"`,
            onclose: () => {
              clearSearch();
            },
          });
        }

        (countriesFilter.value || []).forEach(country => {
          active.push({
            text: country.label,
            onclose: () => {
              removeFilterValue(countriesFilter, country.value);
            },
          });
        });

        (languagesFilter.value || []).forEach(language => {
          active.push({
            text: language.label,
            onclose: () => {
              removeFilterValue(languagesFilter, language.value);
            },
          });
        });

        (categoriesFilter.value || []).forEach(category => {
          active.push({
            text: category.label,
            onclose: () => {
              removeFilterValue(categoriesFilter, category.value);
            },
          });
        });

        return active;
      });

      function clearFilters() {
        categoriesFilter.value = [];
        languagesFilter.value = [];
        countriesFilter.value = [];
        clearSearch();
      }

      function getChannelDetailsRoute(channel) {
        return {
          name: RouteNames.COMMUNITY_LIBRARY_DETAILS,
          params: {
            channelId: channel.id,
          },
        };
      }

      function onCardClick(channel) {
        router.push(getChannelDetailsRoute(channel));
      }

      function openSidePanel() {
        showFiltersSidePanel.value = true;
      }

      function closeSidePanel() {
        showFiltersSidePanel.value = false;
      }

      // deep: true makes Vue compare the old and new computed values deeply,
      // so the handler only fires when the relevant params actually change.
      watch(
        fetchQueryParams,
        (newQueryParams, oldQueryParams) => {
          if (!isEqual(newQueryParams, oldQueryParams)) {
            loadCommunityLibrary();
          }
        },
        { immediate: true, deep: true },
      );

      return {
        windowIsSmall,
        windowBreakpoint,
        loading,
        loadError,
        channels,
        activeFilters,
        showFiltersSidePanel,
        asideStyles,
        count,
        totalPages,
        skeletonsConfig,
        isAboutCommunityLibraryOpen,
        clearFilters,
        getChannelDetailsRoute,
        onCardClick,
        openSidePanel,
        closeSidePanel,
        filterLabel$,
        clearAll$,
        resultsText$,
        noResults$,
        loadError$,
        communityLibraryLabel$,
        whatIsCommunityLibrary$,
        communityLibraryDescription$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .community-page-wrapper {
    display: flex;
    flex-direction: row;
    height: 100%;

    &.mobile {
      flex-direction: column;

      .community-main-content {
        overflow: visible;
      }
    }
  }

  .community-sidebar {
    width: 300px;

    &.mobile {
      width: 100%;
    }
  }

  .community-main-content {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow: auto;
  }

  .community-filters-wrapper {
    width: 100%;
    height: 100%;
  }

  .filter-button {
    margin: 16px;
  }

  .filter-panel {
    width: 100%;
    height: 100%;
  }

  .p-16 {
    padding: 16px;
  }

  .active-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 16px;
    margin-bottom: 16px;
  }

  .clear-link {
    margin-left: 8px;
  }

  .content-container {
    padding: 16px;

    p {
      margin: 8px 0;
    }
  }

  .list-wrapper {
    max-width: 1080px;
    margin: 0 auto;
  }

  .results-header {
    margin-bottom: 16px;
  }

  .results-text {
    min-height: 30px;
    margin-bottom: 8px;
    font-size: 20px;
  }

  .channels-grid {
    display: grid;
    grid-auto-flow: row;
    gap: 16px;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }

  .empty-state {
    padding: 16px 0;
    text-align: center;
  }

  .pagination-container {
    display: flex;
    justify-content: center;
    padding: 16px 0 48px;
  }

  .pagination-range {
    font-size: 14px;
  }

</style>
