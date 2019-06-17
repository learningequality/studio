<template>
  <VApp>
    <VBtn @click="openModal('EDIT')">
      Edit Modal
    </VBtn>

    <VBtn @click="openModal('VIEW_ONLY')">
      View Only
    </VBtn>

    <VBtn @click="openModal('NEW_TOPIC')">
      Add Topic
    </VBtn>

    <VBtn @click="openModal('NEW_EXERCISE')">
      Add Exercise
    </VBtn>

    <VBtn @click="openModal('UPLOAD')">
      Upload File
    </VBtn>

    <EditModal v-if="mode" ref="editmodal" @modalclosed="reset" />
  </VApp>
</template>
<script>

  import _ from 'underscore';
  import { mapMutations, mapState } from 'vuex';
  import EditModal from 'edit_channel/uploader/views/EditModal.vue';

  export default {
    name: 'Sandbox',
    components: {
      EditModal,
    },
    methods: {
      ...mapMutations('edit_modal', {
        setNodes: 'SET_NODES',
        setMode: 'SET_MODE',
        reset: 'RESET_STATE',
      }),
      ...mapState('edit_modal', ['mode']),
      openModal(mode) {
        this.setMode(mode);
        let nodes = mode === 'VIEW_ONLY' || mode === 'EDIT' ? _.clone(window.nodes) : [];
        this.setNodes(nodes);
        this.$refs.editmodal.openModal();
      },
    },
  };

</script>


<style lang="less" scoped>
</style>
