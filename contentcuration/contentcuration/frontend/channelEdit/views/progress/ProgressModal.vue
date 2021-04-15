<template>

  <div v-if="isSyncing || nothingToSync || isPublishing">
    <KModal
      v-if="!displayCancelModal"
      data-test="progress-modal"
      :title="progressModalTitle"
    >
      {{ progressModalDescription }}

      <ProgressBar
        v-if="!nothingToSync"
        data-test="progress-bar"
        :progressPercent="progressPercent"
        :currentTaskError="currentTaskError"
      />
      <div
        v-if="currentTaskError"
        class="caption mt-2 red--text"
      >
        <Icon small color="red">
          error
        </Icon>
        {{ $tr('defaultErrorText') }}
      </div>

      <template slot="actions">
        <KButton
          v-if="isFinished || currentTaskError"
          primary
          data-test="refresh-button"
          @click="cancelTaskAndClose(currentTask)"
        >
          {{ $tr('refreshButton') }}
        </KButton>
        <KButton
          v-else
          primary
          data-test="stop-button"
          @click="displayCancelModal = true"
        >
          {{ $tr('stopButton') }}
        </KButton>
      </template>
    </KModal>

    <KModal
      v-else
      data-test="cancel-modal"
      :title="$tr('cancelHeader')"
      :submitText="$tr('confirmStopButton')"
      :cancelText="$tr('cancel')"
      @submit="cancelTaskAndClose(currentTask)"
      @cancel="displayCancelModal = false"
    >
      {{ $tr('cancelText') }}
    </KModal>
  </div>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import get from 'lodash/get';
  import ProgressBar from './ProgressBar';

  export default {
    name: 'ProgressModal',
    components: {
      ProgressBar,
    },
    props: {
      syncing: {
        type: Boolean,
        default: false,
      },
      noSyncNeeded: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        displayCancelModal: false,
      };
    },
    computed: {
      ...mapGetters('task', ['currentTasksForChannel']),
      ...mapGetters('currentChannel', ['currentChannel']),
      currentTasks() {
        return this.currentTasksForChannel(this.currentChannel.id) || null;
      },
      isSyncing() {
        return this.syncing && this.currentChannel && !this.currentChannel.publishing;
      },
      // this handles validation errors from the Sync Resources Modal
      // where .sync itself errors because of the validation error
      // for not syncing channels with no imported resources
      // this property is added her as a way to manager feedback to the user
      nothingToSync() {
        return this.isSyncing && this.noSyncNeeded;
      },
      isPublishing() {
        return this.currentChannel && this.currentChannel.publishing;
      },
      currentTask() {
        if (this.isSyncing) {
          return this.currentTasks.find(task => task.task_type === 'sync-channel');
        } else if (this.isPublishing) {
          return this.currentTasks.find(task => task.task_type === 'export-channel');
        } else {
          return null;
        }
      },
      progressPercent() {
        if (this.nothingToSync) {
          return 100;
        }
        return get(this.currentTask, ['metadata', 'progress'], 0);
      },
      isFinished() {
        return this.progressPercent >= 100;
      },
      currentTaskError() {
        return Boolean(
          get(this.currentTask, ['metadata', 'error'], null) ||
            get(this.currentTask, 'status') === 'FAILURE'
        );
      },
      progressModalTitle() {
        if (this.isPublishing) {
          return this.$tr('publishHeader');
        }
        if (this.isSyncing || this.nothingToSync) {
          return this.$tr('syncHeader');
        }
        return '';
      },
      progressModalDescription() {
        if (this.isPublishing) {
          return this.$tr('publishDescription');
        }
        if (this.isFinished && (this.isSyncing || this.nothingToSync)) {
          return this.$tr('finishedMessage');
        } else if ((this.currentTask && this.isPublishing) || this.currentChannel.publishing) {
          return this.$tr('publishDescription');
        } else if (this.syncing || (this.currentTask && this.isSyncing)) {
          return this.$tr('syncDescription');
        }
        if (this.isSyncing || this.nothingToSync) {
          return this.$tr('syncDescription');
        }
        return '';
      },
    },
    methods: {
      ...mapActions('currentChannel', ['stopTask']),
      cancelTaskAndClose(task) {
        this.stopTask(task).then(() => {
          window.location.reload();
        });
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      defaultHeader: 'Updating channel',
      defaultDescription: 'Update is in progress, please wait...',
      /* eslint-enable */
      defaultErrorText:
        'An unexpected error has occurred. Please try again, and if you continue to see this message, please contact support via the Help menu.',
      finishedMessage: 'Operation complete! Click "Refresh" to update the page.',
      publishHeader: 'Publishing channel',
      publishDescription:
        'Once publishing is complete, you will receive an email notification and will be able to make further edits to your channel.',
      syncHeader: 'Syncing channel',
      syncDescription: 'Channel syncing is in progress, please wait...',
      stopButton: 'Stop',
      refreshButton: 'Refresh',
      cancel: 'No, go back',
      confirmStopButton: 'Yes, stop task',
      cancelHeader: 'Are you sure?',
      cancelText: 'Are you sure you would like to cancel this task?',
    },
  };

</script>
