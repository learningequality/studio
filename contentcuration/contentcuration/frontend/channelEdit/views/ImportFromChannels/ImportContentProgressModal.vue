<template>

  <VDialog
    :value="true"
    persistent
    width="50%"
    @keydown.esc="handleCancel"
  >
    <VCard class="pa-2">
      <VCardTitle>
        <h2> {{ cardTitle }}</h2>
      </VCardTitle>
      <VCardText>
        <p>{{ cardText }}</p>

        <VLayout v-if="!isCanceling" row align-center>
          <VProgressLinear color="secondary" :value="progress" />
          <span class="ml-2">
            {{ $formatNumber(progress / 100, { style: 'percent' }) }}
          </span>
        </VLayout>
      </VCardText>
      <VCardActions class="text-xs-right">
        <VLayout row justify-end>
          <VBtn v-if="secondaryBtnTxt" flat @click="handleCancel">
            {{ secondaryBtnTxt }}
          </VBtn>
          <VBtn color="primary" @click="handleSubmit">
            {{ primaryBtnText }}
          </VBtn>
        </VLayout>
      </VCardActions>
    </VCard>
  </VDialog>

</template>


<script>

  import get from 'lodash/get';

  const States = {
    IN_PROGRESS: 'IN_PROGRESS',
    CANCELING: 'CANCELING',
    COMPLETED: 'COMPLETED',
  };

  export default {
    name: 'ImportContentProgressModal',
    props: {
      watchTaskId: {
        type: [String, Number],
        required: true,
      },
    },
    data() {
      return {
        state: States.IN_PROGRESS,
        taskData: null,
      };
    },
    computed: {
      cardTitle() {
        return (
          {
            [States.IN_PROGRESS]: this.$tr('inProgressTitle'),
            [States.COMPLETED]: this.$tr('completedTitle'),
            [States.CANCELING]: this.$tr('cancelingTitle'),
          }[this.state] || ''
        );
      },
      cardText() {
        return (
          {
            [States.IN_PROGRESS]: this.$tr('inProgressText'),
            [States.COMPLETED]: this.$tr('completedText'),
            [States.CANCELING]: this.$tr('cancelingText'),
          }[this.state] || ''
        );
      },
      primaryBtnText() {
        return (
          {
            [States.IN_PROGRESS]: this.$tr('stopImportAction'),
            [States.COMPLETED]: this.$tr('refreshAction'),
            [States.CANCELING]: this.$tr('stopTaskAction'),
          }[this.state] || ''
        );
      },
      secondaryBtnTxt() {
        if (this.state === States.CANCELING) {
          return this.$tr('goBackAction');
        }
        return '';
      },
      progress() {
        if (!this.taskData) {
          return 0;
        }
        // Because sometimes a task can "succeed" before progress is 100%
        if (this.taskIsCompleted) {
          return 100;
        }
        return this.taskData.metadata.progress;
      },
      isCanceling() {
        return this.state === States.CANCELING;
      },
      taskIsCompleted() {
        return get(this.taskData, 'status') === 'SUCCESS';
      },
    },
    mounted() {
      this.updateTaskData().then(() => {
        this.pollUpdateTaskData();
      });
    },
    methods: {
      pollUpdateTaskData() {
        if (this.taskIsCompleted) {
          this.state = States.COMPLETED;
        } else {
          setTimeout(() => {
            this.updateTaskData()
              .then(() => {
                this.pollUpdateTaskData();
              })
              .catch(() => {
                this.$emit('cancel');
              });
          }, 1000);
        }
      },
      updateTaskData() {
        return this.$store
          .dispatch('importFromChannels/updateTaskProgress', this.watchTaskId)
          .then(task => {
            this.taskData = { ...task };
            // If in CANCELING state and task completes, switch back to COMPLETED state
            if (this.taskIsCompleted) {
              this.state = States.COMPLETED;
            }
          });
      },
      handleCancel() {
        if (this.isCanceling) {
          // Go back to previous state
          this.state = this.taskIsCompleted ? States.COMPLETED : States.IN_PROGRESS;
        } else {
          this.$emit('cancel');
        }
      },
      handleSubmit() {
        if (this.state === States.IN_PROGRESS) {
          this.state = States.CANCELING;
        } else {
          this.$store.dispatch('importFromChannels/deleteTask', this.watchTaskId).then(() => {
            this.$emit('cancel');
          });
        }
      },
    },
    $trs: {
      inProgressTitle: 'Importing content',
      inProgressText: 'Import operation is in progres. Please wait…',
      stopImportAction: 'Stop import',
      completedTitle: 'Import complete',
      completedText: `Operation is complete. Click "Refresh" to update the page`,
      refreshAction: 'Refresh',
      cancelingTitle: 'Are you sure?',
      cancelingText: 'Import is in-progress. Are you sure you want to stop the task?',
      stopTaskAction: 'Yes, stop task',
      goBackAction: 'No, go back',
    },
  };

</script>


<style lang="scss" scoped></style>
