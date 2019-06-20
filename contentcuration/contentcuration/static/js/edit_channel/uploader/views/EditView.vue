<template>
  <VContent>
    <VContainer fluid fillHeight>
      <VLayout v-if="!selected.length" justifyCenter alignCenter fillHeight>
        <VFlex grow class="default-content">
          {{ noItemText }}
        </VFlex>
      </VLayout>
      <VLayout v-else-if="loadError" justifyCenter alignCenter fillHeight>
        <VFlex grow class="default-content">
          <v-icon color="red" class="error-icon">
            error
          </v-icon>
          <p>{{ $tr('loadErrorText') }}</p>
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
            <!-- Details tab -->
            <VTab @click="currentTab = tabs.DETAILS">
              {{ $tr(tabs.DETAILS) }}
              <v-tooltip v-if="invalidSelected" top>
                <template v-slot:activator="{ on }">
                  <v-icon color="red" dark v-on="on">
                    error
                  </v-icon>
                </template>
                <span>{{ $tr('invalidFieldsToolTip') }}</span>
              </v-tooltip>
            </VTab>

            <!-- Preview tab -->
            <VTab v-if="showPreviewTab" @click="currentTab = tabs.PREVIEW">
              {{ $tr(tabs.PREVIEW) }}
            </VTab>

            <!-- Questions tab -->
            <VTab v-if="showQuestionsTab" @click="currentTab = tabs.QUESTIONS">
              {{ $tr(tabs.QUESTIONS) }}
              <VChip v-if="oneSelected.assessment_items.length" color="gray" dark>
                {{ oneSelected.assessment_items.length }}
              </VChip>
            </VTab>

            <!-- Prerequisites tab -->
            <VTab v-if="showPrerequisitesTab" @click="currentTab = tabs.PREREQUISITES">
              {{ $tr(tabs.PREREQUISITES) }}
              <VChip v-if="oneSelected.prerequisite.length" color="gray" dark>
                {{ oneSelected.prerequisite.length }}
              </VChip>
            </VTab>
          </VTabs>
          <VTabsItems v-model="currentTab">
            <VTabItem :key="tabs.DETAILS" :value="tabs.DETAILS" lazy>
              <DetailsViewOnlyView v-if="viewOnly" />
              <DetailsEditView v-else />
            </VTabItem>
            <VTabItem :key="tabs.PREVIEW" :value="tabs.PREVIEW" lazy>
              <DetailsViewOnlyView />
            </VTabItem>
            <VTabItem :key="tabs.QUESTIONS" :value="tabs.QUESTIONS" lazy>
              <DetailsViewOnlyView />
            </VTabItem>
            <VTabItem :key="tabs.PREREQUISITES" :value="tabs.PREREQUISITES" lazy>
              <DetailsViewOnlyView />
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
      addTopicText: 'Please add a topic to get started',
      addExerciseText: 'Please add an exercise to get started',
      loadingText: 'Loading Content...',
      loadErrorText: 'Unable to load content',
      invalidFieldsToolTip: 'Invalid fields detected',
    },
    components: {
      DetailsEditView,
      DetailsViewOnlyView,
    },
    data() {
      return {
        currentTab: null,
        loadError: false,
        loadNodesDebounced: _.debounce(() => {
          this.loadError = false;
          let selectedIDs = _.chain(this.selected)
            .where({ loaded: false })
            .pluck('id')
            .value();
          this.loadNodes(selectedIDs).catch(() => {
            this.loadError = true;
          });
        }, 1000),
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['selected', 'allExercises', 'allResources', 'invalidNodes']),
      ...mapState('edit_modal', ['viewOnly', 'isClipboard', 'nodes', 'selectedIndices', 'mode']),
      noItemText() {
        if (!this.nodes.length) {
          if (this.mode === modes.NEW_EXERCISE) return this.$tr('addExerciseText');
          else if (this.mode === modes.NEW_TOPIC) return this.$tr('addTopicText');
        }
        return this.viewOnly ? this.$tr('noItemsToViewText') : this.$tr('noItemsToEditText');
      },
      tabs() {
        return TabNames;
      },
      viewOnly() {
        return this.mode === modes.VIEW_ONLY;
      },
      oneSelected() {
        return this.selected.length === 1 && this.selected[0];
      },
      showPreviewTab() {
        return this.oneSelected && this.oneSelected.files.length;
      },
      showQuestionsTab() {
        return this.oneSelected && this.allExercises;
      },
      showPrerequisitesTab() {
        return this.oneSelected && !this.isClipboard && this.allResources;
      },
      allLoaded() {
        return !_.some(this.selected, { loaded: false });
      },
      invalidSelected() {
        return _.intersection(this.selectedIndices, this.invalidNodes).length;
      },
    },
    watch: {
      selected(newVal) {
        this.currentTab = TabNames.DETAILS;
        if (newVal.length > 0) this.loadNodesDebounced();
      },
    },
    methods: {
      ...mapActions('edit_modal', ['loadNodes']),
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .default-content {
    .empty_default;

    margin: 10% auto;
  }

  .v-tabs__div {
    font-weight: bold;
    .v-icon {
      margin-left: 5px;
      font-size: 12pt;
    }
  }

  .v-chip {
    height: 20px;
    margin-left: 10px;
  }

  .error-icon {
    margin-bottom: 20px;
    font-size: 45pt;
  }

</style>
