<template>

  <div class="catalog-filters-wrapper">
    <!-- Mobile: Filter button that opens SidePanelModal -->
    <KButton
      v-if="isMobile"
      class="filter-button-mobile"
      :text="$tr('searchText')"
      appearance="raised-button"
      @click="openSidePanel"
    />

    <!-- Desktop/Tablet: Permanent side panel as page section -->
    <aside
      v-if="!isMobile"
      class="filter-panel-desktop"
      :class="{ 'filter-panel-rtl': isRTL }"
    >
      <CatalogFilterPanelContent />
    </aside>

    <!-- Main content area that includes CatalogFilterBar and the list -->
    <div
      class="main-content-area"
      :class="{ 'with-sidebar': !isMobile }"
    >
      <CatalogFilterBar />
      <slot></slot>
    </div>

    <!-- Mobile: SidePanelModal for filters (full width) -->
    <SidePanelModal
      v-if="isMobile && showMobilePanel"
      alignment="left"
      fullscreen
      @closePanel="closeSidePanel"
    >
      <CatalogFilterPanelContent />
    </SidePanelModal>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CatalogFilterBar from './CatalogFilterBar';
  import CatalogFilterPanelContent from './CatalogFilterPanelContent';
  import SidePanelModal from 'shared/views/SidePanelModal';

  export default {
    name: 'CatalogFilters',
    components: {
      CatalogFilterBar,
      CatalogFilterPanelContent,
      SidePanelModal,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();

      return {
        isMobile: windowIsSmall,
      };
    },
    data() {
      return {
        showMobilePanel: false,
      };
    },
    computed: {
      isRTL() {
        return window.isRTL;
      },
    },
    methods: {
      openSidePanel() {
        this.showMobilePanel = true;
      },
      closeSidePanel() {
        this.showMobilePanel = false;
      },
    },
    $trs: {
      searchText: 'Search',
    },
  };

</script>


<style lang="scss" scoped>

  .catalog-filters-wrapper {
    display: flex;
  }

  .filter-button-mobile {
    margin: 16px;
  }

  .filter-panel-desktop {
    top: 64px;
    left: 0;
    width: 335px;
    overflow-y: auto;
  }

  .main-content-area {
    flex: 1;
  }
  @media (max-width: 600px) {
    .catalog-filters-wrapper {
      flex-direction: column;
    }

    .main-content-area.with-sidebar {
      margin-right: 0;
      margin-left: 0;
    }

    .filter-panel-desktop {
      display: none;
    }

    .filter-button-mobile {
      align-self: flex-start;
      width: auto;
    }
  }

</style>
