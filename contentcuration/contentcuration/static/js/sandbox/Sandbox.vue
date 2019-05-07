<template>
  <div>
    <VApp>
      <EditModal />
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
  };

</script>


<style lang="less" scoped>
</style>
