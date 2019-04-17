<template>
  <VDialog v-model="dialog" persistent light maxWidth="525" attach="body">
    <VCard class="message">
      <VCardTitle class="header">
        {{ $tr('overlayHeader') }}
      </VCardTitle>
      <VCardText class="description">
        {{ $tr('overlayDescription') }}
      </VCardText>
      <ProgressBar :taskID="taskID" @finished="handleDone" />
      <VCardActions class="actions">
        <VSpacer />
        <VBtn v-if="done" dark flat class="action-button" @click="dialog = false">
          {{ $tr('donePublishingButtton') }}
        </VBtn>
        <VBtn v-else dark flat class="action-button" @click="handleCancel">
          {{ $tr('stopPublishButton') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script>

  import { mapActions, mapState } from 'vuex';
  import ProgressBar from 'edit_channel/sharedComponents/ProgressBar.vue';

  export default {
    name: 'PublishingOverlay',
    $trs: {
      overlayHeader: 'Publishing Channel',
      overlayDescription: 'Please wait for publishing to finish to edit this channel',
      backLink: 'Back to channels',
      stopPublishButton: 'Stop publishing',
      donePublishingButtton: 'Close',
    },
    components: {
      ProgressBar,
    },
    data() {
      return {
        dialog: true,
        done: false,
      };
    },
    computed: {
      ...mapState('publish', ['channel']),
      ...mapActions('publish', ['cancelPublish']),
      homeUrl() {
        return window.Urls.channels();
      },
      taskID() {
        return 'TODO: find taskID for publishing ' + this.channel.id;
      },
    },
    methods: {
      handleDone() {
        this.done = true;
      },
      handleCancel() {},
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .app {
    position: absolute;
  }

  .message {
    padding: 5px 20px;
    border: 1px solid @blue-100;
    * {
      font-family: @font-family;
    }
    .header {
      padding: 0;
      padding-top: 20px;
      font-size: 18pt;
      font-weight: bold;
    }
    .description {
      padding: 0;
      padding-bottom: 30px;
      font-size: 12pt;
      color: @gray-500;
    }
    .actions {
      padding-top: 25px;
      .action-button {
        font-weight: bold;
        text-transform: uppercase;
      }
    }
  }

</style>
