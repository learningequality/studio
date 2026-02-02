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
      <CatalogFilterPanelContent :style="{ padding: '24px 32px 16px' }" />
    </SidePanelModal>
  </div>

</template>


<script>

  import { ref, computed, defineComponent } from 'vue';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CatalogFilterPanelContent from './components/CatalogFilterPanelContent.vue';
  import SidePanelModal from 'shared/views/SidePanelModal';

  export default defineComponent({
    name: 'CatalogFilters',
    components: {
      CatalogFilterPanelContent,
      SidePanelModal,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const tokensTheme = themeTokens();

      const showCatalogFiltersSidePanel = ref(false);

      const asideStyles = computed(() => ({
        backgroundColor: tokensTheme.surface,
        borderRight: `2px solid ${tokensTheme.fineLine}`,
      }));

      const openSidePanel = () => {
        showCatalogFiltersSidePanel.value = true;
      };

      const closeSidePanel = () => {
        showCatalogFiltersSidePanel.value = false;
      };

      return {
        windowIsSmall,
        showCatalogFiltersSidePanel,
        asideStyles,
        openSidePanel,
        closeSidePanel,
      };
    },
    $trs: {
      filterLabel: 'Filter',
    },
  });

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
