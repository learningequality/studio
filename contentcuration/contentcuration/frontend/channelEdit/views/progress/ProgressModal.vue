<template>

  <div>
    <VDialog
      v-if="currentTask && !currentTask.noDialog"
      :value="true"
      persistent
      :width="575"
      attach="body"
      data-test="progressmodal"
    >
      <VCard class="pa-3">
        <VWindow v-model="step">
          <VWindowItem :value="1">
            <VCardTitle class="pb-0 title font-weight-bold">
              {{ headerText }}
            </VCardTitle>
            <VCardText class="py-4">
              <p class="body-1">
                {{ descriptionText }}
              </p>
              <ProgressBar
                :progressPercent="progressPercent"
                :currentTaskError="currentTaskError"
              />
              <VLayout
                v-if="currentTaskError"
                row
                class="caption red--text mt-2"
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
                @click="closeOverlay"
              >
                {{ doneButtonText || $tr('refreshButton') }}
              </VBtn>
              <VBtn v-else color="primary" data-test="stop" @click="step++">
                {{ stopButtonText || $tr('stopButton') }}
              </VBtn>
            </VCardActions>
          </VWindowItem>

          <VWindowItem :value="2">
            <VCardTitle class="pb-0 title font-weight-bold">
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
              <VBtn color="primary" data-test="confirmstop" @click="cancelTask">
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
    },
    data() {
      return {
        step: 1,
      };
    },
    computed: {
      ...mapGetters('task', ['blockingTasks']),
      currentTask() {
        return this.blockingTasks[0];
      },
      progressPercent() {
        return this.currentTask ? get(this.currentTask, ['metadata', 'progress']) : null;
      },
      currentTaskError() {
        return this.currentTask ? get(this.currentTask, ['metadata', 'error']) : null;
      },
      headerText() {
        if (this.currentTask.task_type === 'duplicate-nodes') {
          return this.$tr('copyHeader');
        } else if (this.currentTask.task_type === 'export-channel') {
          return this.$tr('publishHeader');
        } else if (this.currentTask.task_type === 'move-nodes') {
          return this.$tr('moveHeader');
        } else if (
          this.currentTask.task_type === 'sync-channel' ||
          this.currentTask.task_type === 'sync-nodes'
        ) {
          return this.$tr('syncHeader');
        } else {
          return this.$tr('defaultHeader');
        }
      },
      descriptionText() {
        if (this.progressPercent >= 100) {
          return this.$tr('finishedMessage');
        } else if (this.currentTask.task_type === 'duplicate-nodes') {
          return this.$tr('copyDescription');
        } else if (this.currentTask.task_type === 'export-channel') {
          return this.$tr('publishDescription');
        } else if (this.currentTask.task_type === 'move-nodes') {
          return this.$tr('moveDescription');
        } else if (
          this.currentTask.task_type === 'sync-channel' ||
          this.currentTask.task_type === 'sync-nodes'
        ) {
          return this.$tr('syncDescription');
        } else {
          return this.$tr('defaultDescription');
        }
      },
    },
    methods: {
      ...mapActions('task', ['deleteTask']),
      deleteCurrentTask() {
        return this.deleteTask(this.currentTask);
      },
      closeOverlay() {
        this.deleteCurrentTask().then(() => {
          window.location.reload();
        });
      },
      cancelTask() {
        this.deleteCurrentTask();
      },
    },
    $trs: {
      copyHeader: 'Importing resources',
      copyDescription: 'Import is in progress, please wait...',
      defaultHeader: 'Updating channel',
      defaultDescription: 'Update is in progress, please wait...',
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
