<template>
  <div>
    <VApp>
      <VBtn @click="openModal('editmodal')">
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

      <EditModal ref="editmodal" :mode="mode" />
    </VApp>
  </div>
</template>
<script>

  import EditModal from 'edit_channel/uploader/views/EditModal.vue';

  export default {
    name: 'Sandbox',
    components: {
      EditModal,
    },
    data() {
      return {
        mode: 'EDIT',
      };
    },
    methods: {
      openModal(mode) {
        this.mode = mode;
        this.$refs.editmodal.openModal();
      },
    },
  };

</script>


<style lang="less" scoped>
</style>
