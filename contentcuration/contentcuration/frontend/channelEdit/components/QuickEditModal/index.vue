<template>

  <div>
    <EditTitleDescriptionModal
      v-if="isTitleDescriptionOpen"
      :nodeId="nodeIds[0]"
      @close="close"
    />
  </div>

</template>


<script>

  import { mapGetters, mapMutations } from 'vuex';
  import { QuickEditModals } from '../../constants';
  import EditTitleDescriptionModal from './EditTitleDescriptionModal.vue';

  export default {
    name: 'QuickEditModal',
    components: {
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
