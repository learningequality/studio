<template>
  <VApp>
    <PublishModal />
    <PublishingOverlay v-if="isPublishing" :taskID="channel.id" />
  </VApp>
</template>

<script>

  import { mapGetters, mapState } from 'vuex';
  import PublishModal from './PublishModal.vue';
  import PublishingOverlay from './PublishingOverlay.vue';

  export default {
    name: 'PublishWrapper',
    components: {
      PublishModal,
      PublishingOverlay,
    },
    computed: {
      ...mapState('publish', ['channel']),
      ...mapGetters('publish', ['isPublishing']),
      taskID() {
        return this.channel.id;
      },
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
