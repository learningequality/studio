<template>

  <div>
    <EditTitleDescriptionModal
      v-if="isTitleDescriptionOpen"
      :nodeId="nodeIds[0]"
      @close="close"
    />
    <EditLanguageModal
      v-if="isLanguageOpen"
      :nodeIds="nodeIds"
      :resourcesSelectedText="displayedResourceSelectedText"
      @close="close"
    />
    <EditResourcesNeededModal
      v-if="isResourcesNeededOpen"
      :nodeIds="nodeIds"
      :resourcesSelectedText="displayedResourceSelectedText"
      @close="close"
    />
    <EditCategoriesModal
      v-if="isCategoriesOpen"
      :nodeIds="nodeIds"
      :resourcesSelectedText="displayedResourceSelectedText"
      @close="close"
    />
    <EditLevelsModal
      v-if="isLevelsOpen"
      :nodeIds="nodeIds"
      :resourcesSelectedText="displayedResourceSelectedText"
      @close="close"
    />
    <EditLearningActivitiesModal
      v-if="isLearningActivitiesOpen"
      :nodeIds="nodeIds"
      :resourcesSelectedText="displayedResourceSelectedText"
      @close="close"
    />
    <EditSourceModal
      v-if="isEditSourceOpen"
      :nodeIds="nodeIds"
      :resourcesSelectedText="displayedResourceSelectedText"
      @close="close"
    />
    <EditAudienceModal
      v-if="isAudienceOpen"
      :nodeIds="nodeIds"
      :resourcesSelectedText="displayedResourceSelectedText"
      @close="close"
    />
    <EditCompletionModal
      v-if="isCompletionOpen"
      :nodeId="nodeIds[0]"
      @close="close"
    />
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { QuickEditModals } from '../../constants';
  import messages from '../../translator';
  import EditSourceModal from './EditSourceModal';
  import EditLevelsModal from './EditLevelsModal';
  import EditLanguageModal from './EditLanguageModal';
  import EditAudienceModal from './EditAudienceModal';
  import EditCategoriesModal from './EditCategoriesModal';
  import EditCompletionModal from './EditCompletionModal';
  import EditResourcesNeededModal from './EditResourcesNeededModal';
  import EditTitleDescriptionModal from './EditTitleDescriptionModal';
  import EditLearningActivitiesModal from './EditLearningActivitiesModal.vue';

  export default {
    name: 'QuickEditModal',
    components: {
      EditSourceModal,
      EditLevelsModal,
      EditLanguageModal,
      EditAudienceModal,
      EditCategoriesModal,
      EditCompletionModal,
      EditResourcesNeededModal,
      EditTitleDescriptionModal,
      EditLearningActivitiesModal,
    },
    computed: {
      ...mapGetters('contentNode', [
        'getQuickEditModalOpen',
        'getSelectedTopicAndResourceCountText',
      ]),
      openedModal() {
        const quickEditModal = this.getQuickEditModalOpen();
        if (!quickEditModal) {
          return null;
        }
        return quickEditModal.modal;
      },
      nodeIds() {
        const quickEditModal = this.getQuickEditModalOpen();
        if (!quickEditModal) {
          return [];
        }
        return quickEditModal.nodeIds;
      },
      resourcesSelectedText() {
        return this.getSelectedTopicAndResourceCountText(this.nodeIds);
      },
      singleResourceSelected() {
        return (
          this.resourcesSelectedText ===
          // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
          messages.$tr('selectionCount', { topicCount: 0, resourceCount: 1 })
        );
      },
      displayedResourceSelectedText() {
        return this.singleResourceSelected ? '' : this.resourcesSelectedText;
      },
      isTitleDescriptionOpen() {
        return this.openedModal === QuickEditModals.TITLE_DESCRIPTION;
      },
      isLanguageOpen() {
        return this.openedModal === QuickEditModals.LANGUAGE;
      },
      isResourcesNeededOpen() {
        return this.openedModal === QuickEditModals.WHAT_IS_NEEDED;
      },
      isCategoriesOpen() {
        return this.openedModal === QuickEditModals.CATEGORIES;
      },
      isLevelsOpen() {
        return this.openedModal === QuickEditModals.LEVELS;
      },
      isLearningActivitiesOpen() {
        return this.openedModal === QuickEditModals.LEARNING_ACTIVITIES;
      },
      isEditSourceOpen() {
        return this.openedModal === QuickEditModals.SOURCE;
      },
      isAudienceOpen() {
        return this.openedModal === QuickEditModals.AUDIENCE;
      },
      isCompletionOpen() {
        return this.openedModal === QuickEditModals.COMPLETION;
      },
    },
    methods: {
      ...mapActions('contentNode', ['setQuickEditModal']),
      close() {
        this.setQuickEditModal(null);
      },
    },
  };

</script>


<style lang="scss" scoped>

</style>
