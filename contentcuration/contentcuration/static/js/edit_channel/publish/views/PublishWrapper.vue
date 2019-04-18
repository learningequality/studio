<template>
  <VApp>
    <PublishModal />
    <PublishingOverlay v-if="isPublishing" />
  </VApp>
</template>

<script>

  import { mapGetters, mapState } from 'vuex';
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
    computed: {
      ...mapState('publish', ['channel']),
      ...mapGetters('publish', ['isPublishing']),
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
