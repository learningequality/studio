<template>

  <div>
    <VDialog
      v-if="isSyncing || nothingToSync || isPublishing"
      :value="true"
      persistent
      :width="575"
      attach="body"
      data-test="progressmodal"
    >
      <VCard class="pa-3">
        <VWindow v-model="step">
          <VWindowItem :value="1">
            <VCardTitle class="font-weight-bold pb-0 title">
              {{ headerText }}
            </VCardTitle>
            <VCardText class="py-4">
              <p class="body-1">
                {{ descriptionText }}
              </p>
              <ProgressBar
                v-if="!nothingToSync"
                :progressPercent="progressPercent"
                :currentTaskError="currentTaskError"
              />
              <VLayout
                v-if="currentTaskError"
                row
                class="caption mt-2 red--text"
                data-test="error"
              >
                <VFlex class="pr-2">
                  <Icon small color="red">
                    error
                  </Icon>
                </VFlex>
                <VFlex>{{ $tr('defaultErrorText') }}</VFlex>
              </VLayout>
            </VCardText>

            <VCardActions>
              <VSpacer />
              <VBtn
                v-if="progressPercent === 100 || currentTaskError"
                color="primary"
                data-test="refresh"
                @click="cancelTaskAndClose(currentTask)"
              >
                {{ doneButtonText || $tr('refreshButton') }}
              </VBtn>
              <VBtn v-else color="primary" data-test="stop" @click="step++">
                {{ stopButtonText || $tr('stopButton') }}
              </VBtn>
            </VCardActions>
          </VWindowItem>

          <VWindowItem :value="2">
            <VCardTitle class="font-weight-bold pb-0 title">
              {{ cancelHeaderText || $tr('cancelHeader') }}
            </VCardTitle>
            <VCardText class="py-4">
              {{ cancelText || $tr('cancelText') }}
            </VCardText>

            <VCardActions>
              <VSpacer />
              <VBtn flat data-test="cancelstop" @click="step--">
                {{ $tr('cancel') }}
              </VBtn>
              <VBtn
                color="primary"
                data-test="confirmstop"
                @click="cancelTaskAndClose(currentTask)"
              >
                {{ stopButtonText || $tr('confirmStopButton') }}
              </VBtn>
            </VCardActions>
          </VWindowItem>
        </VWindow>
      </VCard>
    </VDialog>

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
        step: 1,
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
        return this.noSyncNeeded;
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
      currentTaskError() {
        return Boolean(
          get(this.currentTask, ['metadata', 'error'], null) ||
            get(this.currentTask, 'status') === 'FAILURE'
        );
      },
      headerText() {
        if (this.currentTask) {
          if (this.currentTask.task_type === 'duplicate-nodes') {
            return this.$tr('copyHeader');
          } else if (this.isPublishing) {
            return this.$tr('publishHeader');
          } else if (this.currentTask.task_type === 'move-nodes') {
            return this.$tr('moveHeader');
          } else if (this.isSyncing || this.nothingToSync) {
            return this.$tr('syncHeader');
          }
        } else if (this.nothingToSync) {
          return this.$tr('syncHeader');
        }
        return this.$tr('publishHeader');
      },
      descriptionText() {
        if (this.currentTask) {
          if (this.progressPercent >= 100) {
            return this.$tr('finishedMessage');
          } else if (this.currentTask.task_type === 'duplicate-nodes') {
            return this.$tr('copyDescription');
          } else if (this.isPublishing) {
            return this.$tr('publishDescription');
          } else if (this.currentTask.task_type === 'move-nodes') {
            return this.$tr('moveDescription');
          } else if (this.isSyncing) {
            return this.$tr('syncDescription');
          }
        } else if (this.nothingToSync) {
          return this.$tr('finishedMessage');
        }
        return this.$tr('publishDescription');
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
      copyHeader: 'Importing resources',
      copyDescription: 'Import is in progress, please wait...',
      /* eslint-disable kolibri/vue-no-unused-translations */
      defaultHeader: 'Updating channel',
      defaultDescription: 'Update is in progress, please wait...',
      /* eslint-enable */
      defaultErrorText:
        'An unexpected error has occurred. Please try again, and if you continue to see this message, please contact support via the Help menu.',
      finishedMessage: 'Operation complete! Click "Refresh" to update the page.',
      moveHeader: 'Moving Content',
      moveDescription: 'Move operation is in progress, please wait...',
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
