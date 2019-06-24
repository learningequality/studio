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
          <VProgressCircular :indeterminate="true" size="50" color="primary" />
          <br><br>
          <p>{{ $tr('loadingText') }}</p>
        </VFlex>
      </VLayout>
      <VLayout v-else justifyCenter>
        <VFlex grow>
          <VTabs v-model="currentTab" fixedTabs sliderColor="primary">
            <!-- Details tab -->
            <VTab :href="`#${tabs.DETAILS}`">
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
            <VTab v-if="showPreviewTab" :href="`#${tabs.PREVIEW}`">
              {{ $tr(tabs.PREVIEW) }}
            </VTab>

            <!-- Questions tab -->
            <VTab v-if="showQuestionsTab" :href="`#${tabs.QUESTIONS}`">
              {{ $tr(tabs.QUESTIONS) }}
              <VChip v-if="oneSelected.assessment_items.length" color="gray" dark>
                {{ oneSelected.assessment_items.length }}
              </VChip>
            </VTab>

            <!-- Prerequisites tab -->
            <VTab v-if="showPrerequisitesTab" :href="`#${tabs.PREREQUISITES}`">
              {{ $tr(tabs.PREREQUISITES) }}
              <VChip v-if="oneSelected.prerequisite.length" color="gray" dark>
                {{ oneSelected.prerequisite.length }}
              </VChip>
            </VTab>
          </VTabs>

          <VTabsItems v-model="currentTab">
            <VTabItem :key="tabs.DETAILS" :value="tabs.DETAILS" lazy>
              <VAlert :value="selected.length > 1" type="info" outline>
                {{ countText }}
              </VAlert>
              <VAlert :value="invalidSelected" type="error" outline icon="error">
                {{ $tr('errorBannerText') }}
              </VAlert>
              <DetailsTabView :viewOnly="viewOnly" />
            </VTabItem>
            <VTabItem :key="tabs.PREVIEW" :value="tabs.PREVIEW" lazy>
              Preview
            </VTabItem>
            <VTabItem :key="tabs.QUESTIONS" :value="tabs.QUESTIONS" lazy>
              Questions
            </VTabItem>
            <VTabItem :key="tabs.PREREQUISITES" :value="tabs.PREREQUISITES" lazy>
              Prerequisites
            </VTabItem>
          </VTabsItems>
        </VFlex>
      </VLayout>
    </VContainer>
  </VContent>
</template>

<script>

  import _ from 'underscore';
  import { mapActions, mapGetters, mapState } from 'vuex';
  import { TabNames, modes } from '../constants';
  import DetailsTabView from './DetailsTabView.vue';

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
      errorBannerText: 'Please address invalid fields',
      editingMultipleCount: 'Editing details for {count, plural,\n =1 {# item}\n other {# items}}',
      viewingMultipleCount: 'Viewing details for {count, plural,\n =1 {# item}\n other {# items}}',
    },
    components: {
      DetailsTabView,
    },
    data() {
      return {
        currentTab: null,
        loadError: false,
        loadNodesDebounced: _.debounce(() => {
          this.loadError = false;
          this.loadNodes(this.selectedIndices).catch(() => (this.loadError = true));
        }, 1000),
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['selected', 'allExercises', 'allResources', 'invalidNodes']),
      ...mapState('edit_modal', ['isClipboard', 'nodes', 'selectedIndices', 'mode']),
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
        return _.all(this.selected, '_COMPLETE');
      },
      invalidSelected() {
        return !this.viewOnly && _.intersection(this.selectedIndices, this.invalidNodes).length;
      },
      countText() {
        let messageArgs = { count: this.selected.length };
        if (this.viewOnly) return this.$tr('viewingMultipleCount', messageArgs);
        return this.$tr('editingMultipleCount', messageArgs);
      },
    },
    watch: {
      selected() {
        this.currentTab = TabNames.DETAILS;
        this.loadNodesDebounced();
      },
    },
    methods: {
      ...mapActions('edit_modal', ['loadNodes']),
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .v-alert {
    padding: 10px;
    margin: 15px;
    font-weight: bold;
  }

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
