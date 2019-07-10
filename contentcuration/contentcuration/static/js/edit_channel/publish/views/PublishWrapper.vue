<template>
  <VApp>
    <PublishModal />
    <ProgressOverlay v-if="currentTask" />
  </VApp>
</template>

<script>

  import { mapGetters } from 'vuex';
  import ProgressOverlay from '../../sharedComponents/ProgressOverlay.vue';
  import PublishModal from './PublishModal.vue';

  export default {
    name: 'PublishWrapper',
    components: {
      PublishModal,
      ProgressOverlay,
    },
    computed: {
      ...mapGetters(['currentTask']),
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
