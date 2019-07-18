<template>
  <VDialog
    v-if="currentTask && !currentTask.noDialog"
    v-model="dialog"
    persistent
    light
    maxWidth="575"
    attach="body"
  >
    <VCard v-if="progress" class="message">
      <VCardTitle class="header">
        {{ headerText }}
      </VCardTitle>
      <VCardText v-if="progressPercent < 100 && !currentTaskError" class="description">
        {{ descriptionText }}
      </VCardText>
      <VCardText v-else class="description">
        {{ finishedText }}
      </VCardText>

      <div class="progress-wrapper">
        <div>
          <ProgressBar
            ref="progressbar"
          />
          <div v-if="currentTaskError" class="status status-error">
            {{ errorText }}
          </div>
          <div class="status">
            {{ message }}
          </div>
        </div>
      </div>
      <VCardActions class="actions">
        <VSpacer />
        <VBtn
          v-if="progressPercent === 100 || currentTaskError"
          dark
          flat
          class="action-button done-button"
          @click="closeOverlay"
        >
          {{ doneButtonText || $tr('refreshButton') }}
        </VBtn>
        <VBtn v-else dark flat class="action-button cancel-button" @click="handleCancel">
          {{ stopButtonText || $tr('stopButton') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script>

  import { mapGetters } from 'vuex';

  import ProgressBar from 'edit_channel/sharedComponents/ProgressBar.vue';
  import { dialog } from 'edit_channel/utils/dialog';

  let taskStringKeys = {
    'duplicate-nodes': 'copy',
    'export-channel': 'publish',
    'move-nodes': 'move',
    'sync-channel': 'sync',
    'sync-nodes': 'sync',
  };

  export default {
    name: 'ProgressOverlay',
    $trs: {
      copyHeader: 'Copying Content',
      copyDescription: 'Copy operation is in progress, please wait...',
      defaultHeader: 'Updating Channel',
      defaultDescription: 'Update is in progress, please wait...',
      defaultErrorText:
        'An unexpected error has occurred. Please try again, and if you continue ' +
        'to see this message, please contact support via the Help menu.',
      finishedMessage: 'Operation complete! Click "Refresh" to update the page.',
      moveHeader: 'Moving Content',
      moveDescription: 'Move operation is in progress, please wait...',
      publishHeader: 'Publishing Channel',
      publishDescription:
        'Please wait for publishing to finish to make further edits.' +
        ' You will receive an email notice once channel publishing is complete.',
      syncHeader: 'Syncing Content',
      syncDescription: 'Content sync operation is in progress, please wait...',
      stopButton: 'Stop',
      doneButton: 'Close',
      refreshButton: 'Refresh',
      cancel: 'Cancel',
      cancelHeader: 'Cancelling Task',
      cancelText: 'Are you sure you would like to cancel this task?',
    },
    components: {
      ProgressBar,
    },
    props: {
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
        progress: true,
        done: false,
        failed: false,
        message: '',
        errorText: this.$tr('defaultErrorText'),
        headerText: this.$tr('defaultHeader'),
        descriptionText: this.$tr('defaultDescription'),
        finishedText: this.$tr('finishedMessage'),
      };
    },
    computed: {
      ...mapGetters(['currentTask', 'currentTaskError', 'progressPercent']),
    },
    mounted: function() {
      let key = taskStringKeys[this.currentTask.task_type];
      if (!key) {
        key = 'default';
      }
      if (key) {
        this.headerText = this.$tr(key + 'Header');
        this.descriptionText = this.$tr(key + 'Description');
      }
    },
    methods: {
      closeOverlay() {
        this.progress = false;
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
        this.$store.dispatch('deleteCurrentTask');
        this.closeOverlay();
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
