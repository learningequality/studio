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
      @close="close"
    />
    <EditResourcesNeededModal
      v-if="isResourcesNeededOpen"
      :nodeIds="nodeIds"
      @close="close"
    />
    <EditCategoriesModal
      v-if="isCategoriesOpen"
      :nodeIds="nodeIds"
      @close="close"
    />
    <EditLevelsModal
      v-if="isLevelsOpen"
      :nodeIds="nodeIds"
      @close="close"
    />
    <EditLearningActivitiesModal
      v-if="isLearningActivitiesOpen"
      :nodeIds="nodeIds"
      @close="close"
    />
    <EditSourceModal
      v-if="isEditSourceOpen"
      :nodeIds="nodeIds"
      @close="close"
    />
    <EditAudienceModal
      v-if="isAudienceOpen"
      :nodeIds="nodeIds"
      @close="close"
    />
  </div>

</template>


<script>

  import { mapGetters, mapMutations } from 'vuex';
  import { QuickEditModals } from '../../constants';
  import EditSourceModal from './EditSourceModal';
  import EditLevelsModal from './EditLevelsModal';
  import EditLanguageModal from './EditLanguageModal';
  import EditAudienceModal from './EditAudienceModal';
  import EditCategoriesModal from './EditCategoriesModal';
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
      EditResourcesNeededModal,
      EditTitleDescriptionModal,
      EditLearningActivitiesModal,
    },
    computed: {
      ...mapGetters('contentNode', ['getQuickEditModalOpen']),
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
    },
    methods: {
      ...mapMutations('contentNode', {
        setQuickEditModalOpen: 'SET_QUICK_EDIT_MODAL_OPEN',
      }),
      close() {
        this.setQuickEditModalOpen(null);
      },
    },
  };

</script>


<style lang="scss" scoped>
  
</style>
