<template>

  <VContent>
    <VContainer fluid fill-height>
      <VLayout v-if="!nodeIds.length" justify-center align-center fill-height>
        <VFlex grow class="default-content">
          {{ noItemText }}
        </VFlex>
      </VLayout>
      <VLayout v-else justify-center>
        <VFlex grow>
          <VTabs v-model="currentTab" fixed-tabs slider-color="primary">
            <!-- Details tab -->
            <VTab ref="detailstab" :href="`#${tabs.DETAILS}`">
              {{ $tr(tabs.DETAILS) }}
              <VTooltip v-if="invalidSelected" top>
                <template v-slot:activator="{ on }">
                  <VIcon color="red" dark v-on="on">
                    error
                  </VIcon>
                </template>
                <span>{{ $tr('invalidFieldsToolTip') }}</span>
              </VTooltip>
            </VTab>

            <!-- Preview tab -->
            <VTab v-if="showPreviewTab" ref="previewtab" :href="`#${tabs.PREVIEW}`">
              {{ $tr(tabs.PREVIEW) }}
            </VTab>

            <!-- Questions tab -->
            <VTab v-if="showQuestionsTab" ref="questiontab" :href="`#${tabs.QUESTIONS}`">
              {{ $tr(tabs.QUESTIONS) }}
              <VTooltip v-if="!areAssessmentItemsValid" top>
                <template v-slot:activator="{ on }">
                  <VIcon color="red" dark v-on="on">
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
              <VChip v-if="firstNode.prerequisite.length" color="gray" dark>
                {{ firstNode.prerequisite.length }}
              </VChip>
            </VTab>
          </VTabs>

          <VTabsItems v-model="currentTab">
            <VTabItem :key="tabs.DETAILS" ref="detailswindow" :value="tabs.DETAILS" lazy>
              <VAlert :value="nodeIds.length > 1" type="info" outline>
                {{ countText }}
              </VAlert>
              <VAlert :value="invalidSelected" type="error" outline icon="error">
                {{ $tr('errorBannerText') }}
              </VAlert>
              <DetailsTabView :viewOnly="viewOnly" :nodeIds="nodeIds" />
            </VTabItem>
            <VTabItem :key="tabs.PREVIEW" ref="previewwindow" :value="tabs.PREVIEW" lazy>
              Preview
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

  import { mapGetters } from 'vuex';
  import { TabNames } from '../constants';
  import DetailsTabView from './DetailsTabView.vue';
  import AssessmentView from './AssessmentView.vue';
  import { isTempId } from 'shared/utils';

  export default {
    name: 'EditView',
    components: {
      DetailsTabView,
      AssessmentView,
    },
    props: {
      isClipboard: {
        type: Boolean,
        default: false,
      },
      nodeIds: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        currentTab: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodes', 'getContentNodeIsValid']),
      ...mapGetters('currentChannel', ['canEdit']),
      firstNode() {
        return this.nodes.length ? this.nodes[0] : null;
      },
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      noItemText() {
        if (!this.nodes.length) {
          /* eslint-disable no-constant-condition */
          if (true) {
            return this.$tr('addExerciseText');
          } else if (false) {
            return this.$tr('addTopicText');
          }
          /* eslint-enable */
        }
        return this.viewOnly ? this.$tr('noItemsToViewText') : this.$tr('noItemsToEditText');
      },
      tabs() {
        return TabNames;
      },
      viewOnly() {
        return !this.canEdit;
      },
      oneSelected() {
        return this.nodeIds.length === 1;
      },
      showPreviewTab() {
        return this.oneSelected && this.firstNode && this.firstNode.files.length;
      },
      showQuestionsTab() {
        return this.oneSelected && this.firstNode && this.firstNode.kind === 'exercise';
      },
      showPrerequisitesTab() {
        return (
          this.oneSelected && !this.isClipboard && this.firstNode && this.firstNode.kind !== 'topic'
        );
      },
      invalidSelected() {
        return (
          !this.viewOnly &&
          this.nodeIds.some(nodeId => !isTempId(nodeId) && !this.getContentNodeIsValid(nodeId))
        );
      },
      countText() {
        let messageArgs = { count: this.nodeIds.length };
        if (this.viewOnly) return this.$tr('viewingMultipleCount', messageArgs);
        return this.$tr('editingMultipleCount', messageArgs);
      },
      areAssessmentItemsValid() {
        return true;
      },
      assessmentItemsCount() {
        return 0;
      },
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
      invalidFieldsToolTip: 'Invalid fields detected',
      errorBannerText: 'Please address invalid fields',
      editingMultipleCount: 'Editing details for {count, plural,\n =1 {# item}\n other {# items}}',
      viewingMultipleCount: 'Viewing details for {count, plural,\n =1 {# item}\n other {# items}}',
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
