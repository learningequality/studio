<template>
  <VApp>
    <PublishModal />
    <PublishingOverlay v-if="channel.main_tree.publishing" />
  </VApp>
</template>

<script>

  import { mapState } from 'vuex';
  import PublishModal from './PublishModal.vue';
  import PublishingOverlay from './PublishingOverlay.vue';

  export default {
    name: 'PublishWrapper',
    $trs: {
      modalHeader: 'Publish Channel',
      cancelButton: 'CANCEL',
      publishButton: 'PUBLISH',
      noChangesLabel: 'No Changes',
    },
    components: {
      PublishModal,
      PublishingOverlay,
    },
    computed: mapState('publish', ['channel']),
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
