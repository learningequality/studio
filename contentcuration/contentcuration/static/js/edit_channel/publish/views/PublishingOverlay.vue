<template>

  <ProgressModal
    :taskID="taskID"
    :headerText="$tr('headerText')"
    :descriptionText="$tr('descriptionText')"
    :stopButtonText="$tr('stopButton')"
    :cancelHeaderText="$tr('cancelHeader')"
    :cancelText="$tr('cancelText')"
  />

</template>
<script>

  import { mapGetters } from 'vuex';
  import ProgressModal from 'frontend/channelEdit/views/progress/ProgressModal';

  export default {
    name: 'PublishingOverlay',
    components: {
      ProgressModal,
    },
    computed: {
      ...mapGetters('publish', ['taskID']),
    },
    $trs: {
      headerText: 'Publishing Channel',
      descriptionText:
        'Please wait for publishing to finish to make further edits.' +
        ' You will receive an email notice once channel publishing is complete.',
      stopButton: 'Stop publishing',
      cancelHeader: 'Stop publishing channel',
      cancelText: 'Are you sure you would like to stop publishing your channel?',
    },
  };

</script>


<style lang="less" scoped>

</style>
