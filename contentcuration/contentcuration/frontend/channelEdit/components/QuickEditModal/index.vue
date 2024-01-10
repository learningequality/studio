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
  </div>

</template>


<script>

  import { mapGetters, mapMutations } from 'vuex';
  import { QuickEditModals } from '../../constants';
  import EditLanguageModal from './EditLanguageModal';
  import EditTitleDescriptionModal from './EditTitleDescriptionModal';

  export default {
    name: 'QuickEditModal',
    components: {
      EditLanguageModal,
      EditTitleDescriptionModal,
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
