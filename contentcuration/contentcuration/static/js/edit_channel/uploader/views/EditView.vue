<template>
  <VContent>
    <VContainer fluid fillHeight>
      <VLayout v-if="!selected.length" justifyCenter alignCenter fillHeight>
        <VFlex grow class="default-content">
          {{ noItemText }}
        </VFlex>
      </VLayout>
      <VLayout v-else-if="!allLoaded" justifyCenter alignCenter fillHeight>
        <VFlex grow class="default-content">
          {{ $tr('loadingText') }}
          <VProgressLinear :indeterminate="true" />
        </VFlex>
      </VLayout>
      <VLayout v-else justifyCenter>
        <VFlex grow>
          <VTabs fixedTabs sliderColor="primary">
            <VTab v-for="(item, key) in tabs" :key="key" @click="currentTab=key">
              {{ $tr(key) }}
              <VChip v-if="item.count" color="gray" dark class="tab-count">
                {{ item.count }}
              </VChip>
            </VTab>
          </VTabs>
          <VTabsItems v-model="currentTab">
            <VTabItem
              v-for="(item, key) in tabs"
              :key="key + '-tab'"
              :value="key"
              lazy
            >
              <component :is="item.component" />
            </VTabItem>
          </VTabsItems>
        </VFlex>
      </VLayout>
    </VContainer>
  </VContent>
</template>

<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { TabNames, modes } from '../constants';
  import DetailsEditView from './DetailsEditView.vue';
  import DetailsViewOnlyView from './DetailsViewOnlyView.vue';

  export default {
    name: 'EditView',
    $trs: {
      [TabNames.DETAILS]: 'Details',
      [TabNames.PREVIEW]: 'Preview',
      [TabNames.QUESTIONS]: 'Questions',
      [TabNames.PREREQUISITES]: 'Prerequisites',
      noItemsToEditText: 'Please select an item or items to edit',
      noItemsToViewText: 'Please select an item or items to view',
      loadingText: 'Loading Content...',
    },
    components: {
      DetailsEditView, // eslint-disable-line vue/no-unused-components
      DetailsViewOnlyView, // eslint-disable-line vue/no-unused-components
    },
    props: {
      mode: {
        type: String,
        default: modes.VIEW_ONLY,
      },
    },
    data() {
      return {
        currentTab: null,
        loadError: false,
        loader: this.loadNodesDebounced(),
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['selected', 'allExercises', 'allResources']),
      ...mapState('edit_modal', ['viewOnly', 'isClipboard']),
      noItemText() {
        return this.mode === modes.VIEW_ONLY
          ? this.$tr('noItemsToViewText')
          : this.$tr('noItemsToEditText');
      },
      tabs() {
        let map = {
          [TabNames.DETAILS]: { component: 'DetailsEditView' },
        };

        // Set detail view to view only mode
        if (this.mode === modes.VIEW_ONLY) {
          map[TabNames.DETAILS] = { component: 'DetailsViewOnlyView' };
        }

        // Only show some tabs if only one item is selected
        if (this.selected.length === 1) {
          map[TabNames.PREVIEW] = { component: 'DetailsViewOnlyView' };

          // Only show question editor if the item is a question
          if (this.selected[0].kind === 'exercise') {
            map[TabNames.QUESTIONS] = {
              component: 'DetailsViewOnlyView',
              count: this.selected[0].assessment_items.length,
            };
          }

          // Only show prerequisites if not editing a topic or clipboard item
          if (!this.isClipboard && this.allResources) {
            map[TabNames.PREREQUISITES] = {
              component: 'DetailsViewOnlyView',
              count: this.selected[0].prerequisite.length,
            };
          }
        }

        return map;
      },
      allLoaded() {
        return !_.some(this.selected, { loaded: false });
      },
    },
    watch: {
      selected(newVal) {
        if (newVal.length > 0) {
          this.loader();
        }
      },
    },
    mounted() {
      this.currentTab = TabNames.DETAILS;
    },
    methods: {
      ...mapActions('edit_modal', ['loadNodes']),
      loadNodesDebounced() {
        return _.debounce(() => {
          let selectedIDs = _.chain(this.selected)
            .where({ loaded: false })
            .pluck('id')
            .value();
          this.loadNodes(selectedIDs);
        }, 1000);
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .default-content {
    .empty_default;

    margin: 10% auto;
  }

  /deep/ .v-tabs__item {
    font-weight: bold;
  }

  .tab-count {
    height: 20px;
    margin-left: 10px;
  }

</style>
