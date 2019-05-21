<template>
  <div>
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

      <EditModal v-if="mode" :mode="mode" @modalclosed="mode=null" />
    </VApp>
  </div>
</template>
<script>

  import { mapMutations } from 'vuex';
  import EditModal from 'edit_channel/uploader/views/EditModal.vue';

  export default {
    name: 'Sandbox',
    components: {
      EditModal,
    },
    data() {
      return {
        mode: null,
      };
    },
    methods: {
      ...mapMutations('edit_modal', { setNodes: 'SET_NODES' }),
      openModal(mode) {
        let nodes = mode === 'VIEW_ONLY' || mode === 'EDIT' ? window.nodes : [];
        this.setNodes(nodes);
        this.mode = mode;
      },
    },
  };

</script>


<style lang="less" scoped>
</style>
