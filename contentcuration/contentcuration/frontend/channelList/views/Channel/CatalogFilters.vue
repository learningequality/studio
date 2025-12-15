<template>

  <div class="catalog-filters-wrapper">
    <!-- Mobile: Filter button that opens SidePanelModal -->
    <KButton
      v-if="windowIsSmall"
      class="filter-button-mobile"
      :text="$tr('filterText')"
      appearance="raised-button"
      icon="filter"
      @click="openSidePanel"
    />

    <!-- Desktop/Tablet: Permanent side panel -->
    <aside
      v-if="!windowIsSmall"
      class="filter-panel-desktop"
    >
      <CatalogFilterPanelContent />
    </aside>

    <!-- Mobile: SidePanelModal for filters (full width) -->
    <SidePanelModal
      v-if="windowIsSmall && showMobilePanel"
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
  import CatalogFilterPanelContent from './components/CatalogFilterPanelContent.vue';
  import SidePanelModal from 'shared/views/SidePanelModal';

  export default {
    name: 'CatalogFilters',
    components: {
      CatalogFilterPanelContent,
      SidePanelModal,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();

      return {
        windowIsSmall,
      };
    },
    data() {
      return {
        showMobilePanel: false,
      };
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
    width: 100%;
    height: 100%;
  }

  .filter-button-mobile {
    margin: 16px;
  }

  .filter-panel-desktop {
    width: 100%;
    height: 100%;
  }

</style>
