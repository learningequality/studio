<template>
  <VDialog v-model="dialog" persistent light maxWidth="575" attach="body">
    <VCard class="message">
      <VCardTitle class="header">
        {{ headerText }}
      </VCardTitle>
      <VCardText class="description">
        {{ descriptionText }}
      </VCardText>
      <ProgressBar
        ref="progressbar"
        :taskID="taskID"
        @finished="handleDone"
        @cancelled="handleCancelled"
        @failed="handleFailed"
      />
      <VCardActions class="actions">
        <VSpacer />
        <VBtn
          v-if="done || failed"
          dark
          flat
          class="action-button done-button"
          @click="closeOverlay"
        >
          {{ doneButtonText || $tr('doneButton') }}
        </VBtn>
        <VBtn v-else dark flat class="action-button cancel-button" @click="handleCancel">
          {{ stopButtonText || $tr('stopButton') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script>

  import ProgressBar from 'edit_channel/sharedComponents/ProgressBar.vue';
  import { dialog } from 'edit_channel/utils/dialog';

  export default {
    name: 'ProgressOverlay',
    $trs: {
      stopButton: 'Stop',
      doneButton: 'Close',
      cancel: 'Cancel',
      cancelHeader: 'Cancelling Task',
      cancelText: 'Are you sure you would like to cancel this task?',
    },
    components: {
      ProgressBar,
    },
    props: {
      taskID: {
        type: String,
        required: true,
      },
      headerText: {
        type: String,
        required: true,
      },
      descriptionText: {
        type: String,
        default: '',
      },
      doneButtonText: {
        type: String,
        default: '',
      },
      stopButtonText: {
        type: String,
        default: '',
      },
      cancelHeaderText: {
        type: String,
        default: '',
      },
      cancelText: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        dialog: true,
        done: false,
        failed: false,
      };
    },
    methods: {
      closeOverlay() {
        window.location.reload();
      },
      handleDone() {
        this.done = true;
      },
      handleFailed() {
        this.failed = true;
      },
      handleCancelled() {
        window.location.reload();
      },
      handleCancel() {
        let headerText = this.cancelHeaderText || this.$tr('cancelHeader');
        let promptText = this.cancelText || this.$tr('cancelText');
        let stopTaskText = this.stopButtonText || this.$tr('stopButton');
        dialog(headerText, promptText, {
          [this.$tr('cancel')]: () => {},
          [stopTaskText]: () => {
            this.cancelTask();
          },
        });
      },
      cancelTask() {
        this.$refs.progressbar.cancelTask();
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';

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
