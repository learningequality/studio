<template>

  <VContainer id="editViewId" ref="editview" fluid class="pa-0 wrapper" @scroll="scroll">
    <VContainer v-if="!nodeIds.length" fluid>
      <VLayout justify-center align-center fill-height>
        <VFlex grow class="grey--text text-xs-center title">
          {{ noItemText }}
        </VFlex>
      </VLayout>
    </VContainer>
    <VLayout v-else>
      <VFlex grow>
        <ToolBar v-if="showTabs" :flat="!tabsElevated" class="tabs" color="white">
          <Tabs v-model="currentTab" slider-color="primary" height="64px">
            <!-- Details tab -->
            <VTab ref="detailstab" :href="`#${tabs.DETAILS}`" @click="trackTab('Details')">
              {{ $tr(tabs.DETAILS) }}
              <VTooltip v-if="!areDetailsValid || !areFilesValid" top lazy>
                <template #activator="{ on }">
                  <VIconWrapper color="red" dark small class="ml-2" v-on="on">
                    error
                  </VIconWrapper>
                </template>
                <span>{{ $tr('invalidFieldsToolTip') }}</span>
              </VTooltip>
            </VTab>

            <!-- Questions tab -->
            <VTab
              v-if="showQuestionsTab"
              ref="questiontab"
              :href="`#${tabs.QUESTIONS}`"
              @click="trackTab('Questions')"
            >
              {{ $tr(tabs.QUESTIONS) }}
              <VTooltip v-if="!areAssessmentItemsValid" top lazy>
                <template #activator="{ on }">
                  <VIconWrapper color="red" dark v-on="on">
                    error
                  </VIconWrapper>
                </template>
                <span>{{ $tr('invalidFieldsToolTip') }}</span>
              </VTooltip>
              <VChip v-else color="gray" dark>
                {{ assessmentItemsCount }}
              </VChip>
            </VTab>

            <!-- Related resources tab -->
            <VTab
              v-if="showRelatedResourcesTab"
              ref="related-resources-tab"
              :href="`#${tabs.RELATED}`"
              @click="trackTab('Prerequisites')"
            >
              {{ $tr(tabs.RELATED) }}
              <VChip color="gray" dark>
                {{ relatedResourcesCount }}
              </VChip>
            </VTab>
          </Tabs>
        </ToolBar>
        <VContainer fluid>
          <VTabsItems v-model="currentTab">
            <VTabItem :key="tabs.DETAILS" ref="detailswindow" :value="tabs.DETAILS">
              <VAlert v-if="nodeIds.length > 1" :value="true" type="info" color="primary" outline>
                {{ countText }}
              </VAlert>
              <VAlert v-else-if="!areDetailsValid" :value="true" type="error" outline icon="error">
                {{ $tr('errorBannerText') }}
                <ul>
                  <li
                    v-for="(error, index) in errorsList"
                    :key="index"
                    @click="handleErrorClick(error)"
                  >
                    <a class="error-ref"> {{ $tr(error) }} </a>
                  </li>
                </ul>
              </VAlert>
              <DetailsTabView
                :key="nodeIds.join('-')"
                ref="detailsTab"
                :nodeIds="nodeIds"
              />
            </VTabItem>
            <VTabItem :key="tabs.QUESTIONS" ref="questionwindow" :value="tabs.QUESTIONS" lazy>
              <AssessmentTab :nodeId="nodeIds[0]" />
            </VTabItem>
            <VTabItem :key="tabs.RELATED" :value="tabs.RELATED" lazy>
              <RelatedResourcesTab :nodeId="nodeIds[0]" />
            </VTabItem>
          </VTabsItems>
        </VContainer>
      </VFlex>
    </VLayout>
  </VContainer>

</template>

<script>

  import reduce from 'lodash/reduce';
  import { mapGetters } from 'vuex';

  import { TabNames } from '../../constants';
  import AssessmentTab from '../../components/AssessmentTab/AssessmentTab';
  import RelatedResourcesTab from '../../components/RelatedResourcesTab/RelatedResourcesTab';
  import DetailsTabView from './DetailsTabView';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import ToolBar from 'shared/views/ToolBar';
  import Tabs from 'shared/views/Tabs';

  const EditFields = {
    TITLE: 'titleLabel',
    LICENSE: 'licenseLabel',
    COPYRIGHT_HOLDER: 'copyrightHolderLabel',
    COMPLETION: 'completionLabel',
    LEARNING_ACTIVITY: 'learningActivityLabel',
  };

  export default {
    name: 'EditView',
    components: {
      DetailsTabView,
      AssessmentTab,
      RelatedResourcesTab,
      Tabs,
      ToolBar,
    },
    props: {
      nodeIds: {
        type: Array,
        default: () => [],
      },
      tab: {
        type: String,
        default: TabNames.DETAILS,
      },
    },
    data() {
      return {
        currentTab: null,
        tabsElevated: false,
        errorsList: [],
      };
    },
    computed: {
      ...mapGetters('contentNode', [
        'getContentNodes',
        'getContentNodeDetailsAreValid',
        'getContentNodeFilesAreValid',
        'getImmediateRelatedResourcesCount',
        'getNodeDetailsErrorsList',
      ]),
      ...mapGetters('assessmentItem', ['getAssessmentItemsAreValid', 'getAssessmentItemsCount']),
      firstNode() {
        return this.nodes.length ? this.nodes[0] : null;
      },
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      noItemText() {
        return this.$tr('noItemsToEditText');
      },
      tabs() {
        return TabNames;
      },
      oneSelected() {
        return this.nodes.length === 1;
      },
      showTabs() {
        return this.oneSelected && this.nodes[0].kind !== ContentKindsNames.TOPIC;
      },
      showQuestionsTab() {
        return this.oneSelected && this.firstNode && this.firstNode.kind === 'exercise';
      },
      showRelatedResourcesTab() {
        return this.oneSelected && this.firstNode && this.firstNode.kind !== 'topic';
      },
      countText() {
        const totals = reduce(
          this.nodes,
          (totals, node) => {
            const isTopic = node.kind === ContentKindsNames.TOPIC;
            return {
              topicCount: totals.topicCount + (isTopic ? 1 : 0),
              resourceCount: totals.resourceCount + (isTopic ? 0 : 1),
            };
          },
          { topicCount: 0, resourceCount: 0 }
        );
        return this.$tr('editingMultipleCount', totals);
      },
      areDetailsValid() {
        this.setErrors(this.nodeIds[0]);
        return !this.oneSelected || this.getContentNodeDetailsAreValid(this.nodeIds[0]);
      },
      areAssessmentItemsValid() {
        return (
          !this.oneSelected ||
          this.getAssessmentItemsAreValid({ contentNodeId: this.nodeIds[0], ignoreDelayed: true })
        );
      },
      areFilesValid() {
        return !this.oneSelected || this.getContentNodeFilesAreValid(this.nodeIds[0]);
      },
      assessmentItemsCount() {
        if (!this.oneSelected) {
          return 0;
        }

        return this.getAssessmentItemsCount(this.nodeIds[0]);
      },
      relatedResourcesCount() {
        if (!this.oneSelected) {
          return;
        }

        return this.getImmediateRelatedResourcesCount(this.firstNode.id);
      },
    },
    watch: {
      nodeIds(newValue, oldValue) {
        this.$refs.editview.scrollTop = 0;
        // If oldValue is empty, user might be navigating in from another page
        // (if they hadn't had anything selected before, tab should have been changed
        // back to details on deselect all anyways)
        if (oldValue.length) {
          this.currentTab = TabNames.DETAILS;
        }
      },
      currentTab(newValue, oldValue) {
        if (newValue === oldValue) {
          return;
        }

        this.$router
          .push({
            params: {
              ...this.$route.params,
              tab: newValue,
            },
          })
          .catch(() => {}); // https://github.com/quasarframework/quasar/issues/5672
      },
    },
    created() {
      this.currentTab = this.tab && this.nodeIds.length <= 1 ? this.tab : TabNames.DETAILS;
    },
    methods: {
      scroll(e) {
        this.tabsElevated = e.target.scrollTop > 0;
      },
      trackTab(name) {
        this.$analytics.trackClick('channel_editor_modal', name);
      },
      handleErrorClick(error) {
        const errorRefs = {
          [EditFields.TITLE]: 'title',
          [EditFields.LICENSE]: 'license',
          [EditFields.COPYRIGHT_HOLDER]: 'copyright_holder',
          [EditFields.COMPLETION]: 'randomize',
          [EditFields.LEARNING_ACTIVITY]: 'learning_activities',
        };

        const errorRef = errorRefs[error];
        const targetElement = this.$refs.detailsTab.$refs[errorRef];

        if (!targetElement) {
          console.error(`Target element ref not found for error: ${error}`);
          return;
        }

        const nativeElement = targetElement.$el;
        const containerElement = this.$refs.editview;
        const position = nativeElement.getBoundingClientRect();
        const offsetY = position.top - nativeElement.clientHeight - 50; //  additional padding of 50 to adjust position.
        containerElement.scrollTo({ top: offsetY, behavior: 'smooth' });
      },
      setErrors(nodeId) {
        const errorsTagList = this.getNodeDetailsErrorsList(nodeId);
        // fetch unique errors
        // set that to errorsList
        const errorRefs = {
          TITLE_REQUIRED: EditFields.TITLE,
          LICENSE_REQUIRED: EditFields.LICENSE,
          COPYRIGHT_HOLDER_REQUIRED: EditFields.COPYRIGHT_HOLDER,
          MASTERY_MODEL_REQUIRED: EditFields.COMPLETION,
          MASTERY_MODEL_M_REQUIRED: EditFields.COMPLETION,
          MASTERY_MODEL_M_WHOLE_NUMBER: EditFields.COMPLETION,
          MASTERY_MODEL_M_GT_ZERO: EditFields.COMPLETION,
          MASTERY_MODEL_M_LTE_N: EditFields.COMPLETION,
          MASTERY_MODEL_N_REQUIRED: EditFields.COMPLETION,
          MASTERY_MODEL_N_WHOLE_NUMBER: EditFields.COMPLETION,
          MASTERY_MODEL_N_GT_ZERO: EditFields.COMPLETION,
          LEARNING_ACTIVITY_REQUIRED: EditFields.LEARNING_ACTIVITY,
        };

        const uniqueErrorsSet = new Set();
        for (const error of errorsTagList) {
          if (errorRefs[error]) {
            uniqueErrorsSet.add(errorRefs[error]);
          }
        }
        const arr = [...uniqueErrorsSet];
        this.errorsList = arr;
      },
      /*
       * @public
       */
      immediateSaveAll: function() {
        return this.$refs.detailsTab.immediateSaveAll();
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      /** @see TabNames.DETAILS */
      details: 'Details',
      /** @see TabNames.PREVIEW */
      preview: 'Preview',
      /** @see TabNames.QUESTIONS */
      questions: 'Questions',
      /** @see TabNames.RELATED */
      related: 'Related',
      /* eslint-enable kolibri/vue-no-unused-translations */
      noItemsToEditText: 'Please select resources or folders to edit',
      invalidFieldsToolTip: 'Some required information is missing',
      errorBannerText: 'Please provide the required information',
      editingMultipleCount:
        'Editing details for {topicCount, plural,\n =1 {# folder}\n other {# folders}}, {resourceCount, plural,\n =1 {# resource}\n other {# resources}}',
      titleLabel: 'Title',
      licenseLabel: 'License',
      copyrightHolderLabel: 'Copyright holder',
      completionLabel: 'Completion',
      learningActivityLabel: 'Learning activity',
    },
  };

</script>

<style lang="scss" scoped>

  .tabs {
    position: sticky;
    top: 0;
    z-index: 5;
  }

  .container {
    width: unset;
  }

  .v-alert {
    padding: 10px;
    margin: 15px;
    font-weight: bold;
  }

  .v-tabs__div {
    min-width: 150px;
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

  .wrapper {
    min-width: 100%;
    max-height: inherit;
    overflow: auto;
  }

  .error-ref {
    color: inherit;
    text-decoration: underline;
  }

</style>
