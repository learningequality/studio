<template>
  <ProgressOverlay
    :taskID="taskID"
    :headerText="$tr('headerText')"
    :descriptionText="$tr('descriptionText')"
    :stopButtonText="$tr('stopButton')"
    :cancelHeaderText="$tr('cancelHeader')"
    :cancelText="$tr('cancelText')"
  />
</template>
<script>

  import { mapGetters, mapState } from 'vuex';
  import ProgressOverlay from 'edit_channel/sharedComponents/ProgressOverlay.vue';

  export default {
    name: 'PublishingOverlay',
    $trs: {
      headerText: 'Publishing Channel',
      descriptionText:
        'Please wait for publishing to finish to make further edits.' +
        ' You will receive an email notice once channel publishing is complete.',
      stopButton: 'Stop publishing',
      cancelHeader: 'Stop publishing channel',
      cancelText: 'Are you sure you would like to stop publishing your channel?',
      emailText: 'You will get an email once the channel finishes publishing',
    },
    components: {
      ProgressOverlay,
    },
    computed: {
      ...mapState('publish', ['channel']),
      ...mapGetters('publish', ['taskID']),
    },
  };

</script>


<style lang="less" scoped>

</style>
