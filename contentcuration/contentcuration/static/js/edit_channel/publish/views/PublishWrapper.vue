<template>
  <VApp>
    <PublishModal />
    <PublishingOverlay v-if="taskID" :taskID="taskID" />
  </VApp>
</template>

<script>

  import { mapGetters } from 'vuex';
  import PublishModal from './PublishModal.vue';
  import PublishingOverlay from './PublishingOverlay.vue';

  export default {
    name: 'PublishWrapper',
    components: {
      PublishModal,
      PublishingOverlay,
    },
    computed: {
      ...mapGetters('publish', ['taskID']),
    },
  };

</script>


<style lang="less" scoped>
  @import '../../../../less/global-variables.less';
  /deep/ .application--wrap {
    min-height: 0;
  }

  /deep/ .v-overlay {
    margin-top: 50px;
  }

</style>
