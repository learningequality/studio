<template>

  <div class="catalog-filters-wrapper">
    <KButton
      v-if="windowIsSmall"
      class="filter-button"
      :text="$tr('filterText')"
      appearance="raised-button"
      icon="filter"
      @click="openSidePanel"
    />
    <aside
      v-if="!windowIsSmall"
      class="filter-panel"
      :style="asideStyles"
    >
      <CatalogFilterPanelContent />
    </aside>
    <SidePanelModal
      v-if="windowIsSmall && showSidePanel"
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
        showSidePanel: false,
      };
    },
    computed: {
      asideStyles() {
        return {
          backgroundColor: this.$themeTokens.surface,
          border: `2px solid ${this.$themeTokens.fineLine}`,
        };
      },
    },
    methods: {
      openSidePanel() {
        this.showSidePanel = true;
      },
      closeSidePanel() {
        this.showSidePanel = false;
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

  .filter-button {
    margin: 16px;
  }

  .filter-panel {
    width: 100%;
    height: 100%;
  }

</style>
