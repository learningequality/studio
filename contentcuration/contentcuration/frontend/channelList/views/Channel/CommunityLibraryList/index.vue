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
        <div
          class="community-library-banner"
          :style="{
            backgroundColor: $themePalette.orange.v_100,
            ...(windowBreakpoint < 4
              ? { flexDirection: 'column', alignItems: 'center', textAlign: 'center' }
              : {}),
          }"
        >
          <div
            class="community-library-icon-wrapper"
            :style="{
              backgroundColor: $themePalette.orange.v_200,
            }"
          >
            <KIcon
              icon="communityLibrary"
              class="community-library-icon"
              :color="$themePalette.white"
              :style="{
                backgroundColor: $themePalette.orange.v_400,
              }"
            />
          </div>
          <div>
            <h2>
              {{ communityLibraryCTATitle$() }}
            </h2>
            <p>
              {{ communityLibraryCTADescription$() }}
            </p>
          </div>
          <div class="button-wrapper">
            <KButton
              :text="goToMyChannelsAction$()"
              @click="goToMyChannels"
            />
          </div>
        </div>
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
        <div>
          <div class="results-header">
            <p
              v-if="!loading && activeFilters.length > 0"
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
              >
                <template #footerActions>
                  <KIconButton
                    v-if="channel.token"
                    icon="copy"
                    :tooltip="copyChannelTokenAction$()"
                    @click.stop.prevent="tokenChannel = channel"
                  />
                </template>
              </StudioChannelCard>
            </KCardGrid>
            <ChannelTokenModal
              :value="Boolean(tokenChannel)"
              appendToOverlay
              :channel="tokenChannel"
              @input="onTokenModalInput"
            >
              <template #additionalInfo>
                <p
                  :style="{
                    color: $themeTokens.error,
                  }"
                >
                  {{ needKolibriVersionToImport$() }}
                </p>
              </template>
            </ChannelTokenModal>
          </div>

          <div
            v-if="!loading && !channels.length && !loadError"
            class="empty-state"
          >
            {{ activeFilters.length ? noResultsWithFilters$() : noCommunityChannels$() }}
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
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import { listPublicChannels } from 'shared/data/public';
  import useStore from 'shared/composables/useStore';
  import StudioChip from 'shared/views/StudioChip';
  import Pagination from 'shared/views/Pagination';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import SidePanelModal from 'shared/views/SidePanelModal';
  import { commonStrings } from 'shared/strings/commonStrings';

  /**
   * This function maps the channel info that comes from the public models, to a format that the
   * current studio components expect (they are used to receive channel info from the
   * contentcuration models)
   */
  function mapResponseChannel(channel) {
    const language = channel.lang_code || channel.included_languages?.[0] || null;
    return {
      ...channel,
      count: channel.total_resource_count || 0,
      language,
      thumbnail_url: channel.thumbnail,
      modified: channel.last_updated,
      last_published: channel.last_published || channel.last_updated,
      primary_token: channel.token,
      published: true,
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
      ChannelTokenModal,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const store = useStore();
      const tokensTheme = themeTokens();
      const { windowIsSmall, windowBreakpoint } = useKResponsiveWindow();
      const tokenChannel = ref(null);

      const {
        filterLabel$,
        clearAll$,
        resultsText$,
        noResultsWithFilters$,
        noCommunityChannels$,
        loadError$,
        communityLibraryLabel$,
        communityLibraryDescription$,
        whatIsCommunityLibrary$,
        needKolibriVersionToImport$,
        communityLibraryCTATitle$,
        communityLibraryCTADescription$,
        goToMyChannelsAction$,
      } = communityChannelsStrings;
      const { copyChannelTokenAction$ } = commonStrings;

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

      function goToMyChannels() {
        router.push({ name: RouteNames.CHANNELS_EDITABLE });
      }

      const onTokenModalInput = value => {
        if (!value) {
          tokenChannel.value = null;
        }
      };

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
        tokenChannel,
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
        onTokenModalInput,
        openSidePanel,
        closeSidePanel,
        goToMyChannels,
        filterLabel$,
        clearAll$,
        resultsText$,
        noResultsWithFilters$,
        noCommunityChannels$,
        loadError$,
        copyChannelTokenAction$,
        communityLibraryLabel$,
        whatIsCommunityLibrary$,
        needKolibriVersionToImport$,
        communityLibraryDescription$,
        communityLibraryCTATitle$,
        communityLibraryCTADescription$,
        goToMyChannelsAction$,
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
    max-width: 1080px;
    padding: 16px;
    margin: 0 auto;

    p {
      margin: 8px 0;
    }
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

  .community-library-banner {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    padding: 20px;
    margin: 24px 0;
    border-radius: 4px;

    .community-library-icon-wrapper {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 96px;
      height: 96px;
      border-radius: 2px;

      .community-library-icon {
        width: 40px;
        height: 40px;
        padding: 6px;
        border-radius: 50%;
      }
    }

    h2 {
      font-size: 18px;
    }

    .button-wrapper {
      flex-shrink: 0;
    }
  }

</style>
