<template>

  <VContent>
    <VContainer fluid fill-height>
      <FileUploadDefault v-if="uploadMode && !nodes.length" />
      <VLayout v-else-if="!selected.length" justify-center align-center fill-height>
        <VFlex grow class="default-content">
          {{ noItemText }}
        </VFlex>
      </VLayout>
      <VLayout v-else-if="loadError" justify-center align-center fill-height>
        <VFlex grow class="default-content">
          <VIcon color="red" class="error-icon notranslate">
            error
          </VIcon>
          <p>{{ $tr('loadErrorText') }}</p>
        </VFlex>
      </VLayout>
      <VLayout v-else-if="!allLoaded" justify-center align-center fill-height>
        <VFlex grow class="default-content">
          <VProgressCircular :indeterminate="true" size="50" color="primary" />
          <br><br>
          <p>{{ $tr('loadingText') }}</p>
        </VFlex>
      </VLayout>
      <VLayout v-else justify-center>
        <VFlex grow>
          <VTabs v-model="currentTab" slider-color="primary">
            <!-- Details tab -->
            <VTab ref="detailstab" :href="`#${tabs.DETAILS}`">
              {{ $tr(tabs.DETAILS) }}
              <VTooltip v-if="invalidSelected || !areFilesValid" top>
                <template v-slot:activator="{ on }">
                  <VIcon color="red" class="notranslate" dark v-on="on">
                    error
                  </VIcon>
                </template>
                <span>{{ $tr('invalidFieldsToolTip') }}</span>
              </VTooltip>
            </VTab>

            <!-- Questions tab -->
            <VTab v-if="showQuestionsTab" ref="questiontab" :href="`#${tabs.QUESTIONS}`">
              {{ $tr(tabs.QUESTIONS) }}
              <VTooltip v-if="!areAssessmentItemsValid" top>
                <template v-slot:activator="{ on }">
                  <VIcon color="red" class="notranslate" dark v-on="on">
                    error
                  </VIcon>
                </template>
                <span>{{ $tr('invalidFieldsToolTip') }}</span>
              </VTooltip>
              <VChip v-else color="gray" dark>
                {{ assessmentItemsCount }}
              </VChip>
            </VTab>

            <!-- Prerequisites tab -->
            <VTab
              v-if="showPrerequisitesTab"
              ref="prerequisitetab"
              :href="`#${tabs.PREREQUISITES}`"
            >
              {{ $tr(tabs.PREREQUISITES) }}
              <VChip v-if="oneSelected.prerequisite.length" color="gray" dark>
                {{ oneSelected.prerequisite.length }}
              </VChip>
            </VTab>
          </VTabs>
          <VTabsItems v-model="currentTab">
            <VTabItem :key="tabs.DETAILS" ref="detailswindow" :value="tabs.DETAILS" lazy>
              <VAlert :value="selected.length > 1" type="info" color="primary" outline>
                {{ countText }}
              </VAlert>
              <VAlert v-if="invalidSelected" :value="true" type="error" outline icon="error">
                {{ $tr('errorBannerText') }}
              </VAlert>
              <DetailsTabView :viewOnly="viewOnly" />
            </VTabItem>
            <VTabItem :key="tabs.QUESTIONS" ref="questionwindow" :value="tabs.QUESTIONS" lazy>
              <AssessmentView />
            </VTabItem>
            <VTabItem
              :key="tabs.PREREQUISITES"
              ref="prerequisiteswindow"
              :value="tabs.PREREQUISITES"
              lazy
            >
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
  import AssessmentView from './AssessmentView.vue';
  import FileUploadDefault from 'edit_channel/file_upload/views/FileUploadDefault.vue';

  export default {
    name: 'EditView',
    components: {
      DetailsTabView,
      FileUploadDefault,
      AssessmentView,
    },
    props: {
      isClipboard: {
        type: Boolean,
        default: false,
      },
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
      ...mapGetters('edit_modal', [
        'selected',
        'allExercises',
        'allResources',
        'isNodeNew',
        'areNodeDetailsValid',
        'areNodeFilesValid',
        'areNodeAssessmentItemsValid',
        'nodeAssessmentItemsCount',
      ]),
      ...mapState('edit_modal', ['nodes', 'selectedIndices', 'mode']),
      noItemText() {
        if (!this.nodes.length) {
          if (this.mode === modes.NEW_EXERCISE) return this.$tr('addExerciseText');
          else if (this.mode === modes.NEW_TOPIC) return this.$tr('addTopicText');
        }
        return this.viewOnly ? this.$tr('noItemsToViewText') : this.$tr('noItemsToEditText');
      },
      uploadMode() {
        return this.mode === modes.UPLOAD;
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
        return (
          !this.viewOnly &&
          this.selectedIndices.some(
            nodeIdx => !this.isNodeNew(nodeIdx) && !this.areNodeDetailsValid(nodeIdx)
          )
        );
      },
      countText() {
        let messageArgs = { count: this.selected.length };
        if (this.viewOnly) return this.$tr('viewingMultipleCount', messageArgs);
        return this.$tr('editingMultipleCount', messageArgs);
      },
      areAssessmentItemsValid() {
        return this.areNodeAssessmentItemsValid(this.selectedIndices[0]);
      },
      areFilesValid() {
        return this.areNodeFilesValid(this.selectedIndices[0]);
      },
      assessmentItemsCount() {
        return this.nodeAssessmentItemsCount(this.selectedIndices[0]);
      },
    },
    watch: {
      selectedIndices() {
        this.currentTab = TabNames.DETAILS;
        this.loadNodesDebounced();
      },
    },
    methods: {
      ...mapActions('edit_modal', ['loadNodes']),
    },
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
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .container {
    width: unset;
  }

  .v-alert {
    padding: 10px;
    margin: 15px;
    font-weight: bold;
  }

  .default-content {
    .empty_default;

    margin: 10% auto;
  }
  .v-tabs {
    margin: -32px -31px 0;
    border-bottom: 1px solid @gray-300;
  }

  .v-tabs__div {
    padding: 0 20px;
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
