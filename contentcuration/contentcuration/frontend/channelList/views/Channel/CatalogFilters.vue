<template>

  <div class="catalog-filters-wrapper">
    <KButton
      v-if="windowIsSmall"
      class="filter-button"
      :text="$tr('filterLabel')"
      appearance="raised-button"
      icon="filter"
      @click="openSidePanel"
    />
    <div
      v-if="!windowIsSmall"
      class="filter-panel"
      :style="asideStyles"
    >
      <CatalogFilterPanelContent />
    </div>
    <SidePanelModal
      v-if="windowIsSmall && showCatalogFiltersSidePanel"
      alignment="left"
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
        showCatalogFiltersSidePanel: false,
      };
    },
    computed: {
      asideStyles() {
        return {
          backgroundColor: this.$themeTokens.surface,
          borderRight: `2px solid ${this.$themeTokens.fineLine}`,
        };
      },
    },
    methods: {
      openSidePanel() {
        this.showCatalogFiltersSidePanel = true;
      },
      closeSidePanel() {
        this.showCatalogFiltersSidePanel = false;
      },
    },
    $trs: {
      filterLabel: 'Filter',
    },
  };

</script>


<style lang="scss" scoped>

  .catalog-filters-wrapper {
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

</style>
