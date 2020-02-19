<template>

  <VContainer fluid fill-height>
    <VLayout v-if="!nodeIds.length" justify-center align-center fill-height>
      <VFlex grow class="text-xs-center title grey--text">
        {{ noItemText }}
      </VFlex>
    </VLayout>
    <VLayout v-else justify-center>
      <VFlex grow>
        <VTabs v-model="currentTab" slider-color="primary">
          <!-- Details tab -->
          <VTab ref="detailstab" :href="`#${tabs.DETAILS}`">
            {{ $tr(tabs.DETAILS) }}
            <VTooltip v-if="!areDetailsValid || !areFilesValid" top>
              <template v-slot:activator="{ on }">
                <Icon color="red" dark small class="ml-2" v-on="on">
                  error
                </Icon>
              </template>
              <span>{{ $tr('invalidFieldsToolTip') }}</span>
            </VTooltip>
          </VTab>

          <!-- Questions tab -->
          <VTab v-if="showQuestionsTab" ref="questiontab" :href="`#${tabs.QUESTIONS}`">
            {{ $tr(tabs.QUESTIONS) }}
            <VTooltip v-if="!areAssessmentItemsValid" top>
              <template v-slot:activator="{ on }">
                <Icon color="red" dark v-on="on">
                  error
                </Icon>
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
            <VAlert v-if="nodeIds.length > 1" :value="true" type="info" color="primary" outline>
              {{ countText }}
            </VAlert>
            <VAlert v-else-if="!areDetailsValid" :value="true" type="error" outline icon="error">
              {{ $tr('errorBannerText') }}
            </VAlert>
            <DetailsTabView :viewOnly="!canEdit" :nodeIds="nodeIds" />
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

</template>

<script>

  import { mapGetters } from 'vuex';
  import { TabNames } from '../constants';
  import DetailsTabView from './DetailsTabView';
  import AssessmentView from './AssessmentView';

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
      ...mapGetters('contentNode', [
        'getContentNodes',
        'getContentNodeDetailsAreValid',
        'getContentNodeFilesAreValid',
      ]),
      ...mapGetters('currentChannel', ['canEdit']),
      firstNode() {
        return this.nodes.length ? this.nodes[0] : null;
      },
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },

      noItemText() {
        return this.canEdit ? this.$tr('noItemsToEditText') : this.$tr('noItemsToViewText');
      },
      tabs() {
        return TabNames;
      },
      oneSelected() {
        return this.nodeIds.length === 1;
      },
      showQuestionsTab() {
        return this.oneSelected && this.firstNode && this.firstNode.kind === 'exercise';
      },
      showPrerequisitesTab() {
        return (
          this.oneSelected && !this.isClipboard && this.firstNode && this.firstNode.kind !== 'topic'
        );
      },
      countText() {
        let messageArgs = { count: this.nodeIds.length };
        if (this.canEdit) return this.$tr('editingMultipleCount', messageArgs);
        return this.$tr('viewingMultipleCount', messageArgs);
      },
      areDetailsValid() {
        return !this.oneSelected || this.getContentNodeDetailsAreValid(this.nodeIds[0]);
      },
      areAssessmentItemsValid() {
        return true;
      },
      areFilesValid() {
        return !this.oneSelected || this.getContentNodeFilesAreValid(this.nodeIds[0]);
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
      invalidFieldsToolTip: 'Invalid fields detected',
      errorBannerText: 'Please address invalid fields',
      editingMultipleCount: 'Editing details for {count, plural,\n =1 {# item}\n other {# items}}',
      viewingMultipleCount: 'Viewing details for {count, plural,\n =1 {# item}\n other {# items}}',
    },
  };

</script>

<style lang="less" scoped>

  .container {
    width: unset;
  }

  .v-alert {
    padding: 10px;
    margin: 15px;
    font-weight: bold;
  }

  .v-tabs {
    margin: -32px -32px 0;
    border-bottom: 1px solid var(--v-grey-lighten3);
  }

  .v-tabs__div {
    padding: 20px;
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
