<template>

  <div class="catalog-filters-wrapper">
    <!-- Mobile: Filter button that opens SidePanelModal -->
    <KButton
      v-if="isMobile"
      class="filter-button-mobile"
      :text="$tr('filterText')"
      appearance="raised-button"
      icon="filter"
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
  import CatalogFilterPanelContent from './components/CatalogFilterPanelContent.vue';
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
      filterText: 'Filter',
    },
  };

</script>


<style lang="scss" scoped>

  .catalog-filters-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow-x: hidden;
  }

  .filter-button-mobile {
    align-self: flex-start;
    margin: 16px;
  }

  .filter-panel-desktop {
    position: fixed;
    top: 100px;
    left: 0;
    width: 335px;
    overflow-y: auto;
  }

  .main-content-area {
    flex: 1;
    min-height: 100vh;

    &.with-sidebar {
      width: calc(100% - 335px);
      margin-left: 335px;
    }
  }

</style>
