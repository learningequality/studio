<template>

  <div class="px-1">
    <div
      v-if="showSyncingProgress"
      class="grey--text"
      data-test="progress"
    >
      <span>{{ $tr('syncHeader') }}</span>&nbsp;<span>{{ progressPercent }}</span>
    </div>
    <div
      v-else-if="syncError"
      class="red--text"
    >
      <Icon icon="error" />
      {{ $tr('syncError') }}
    </div>
    <div
      v-else-if="currentPublishTaskError"
      class="red--text"
    >
      <Icon icon="error" />
      {{ $tr('defaultErrorText') }}
    </div>
    <div
      v-else-if="isPublishing"
      class="grey--text"
      data-test="progress"
    >
      <span>{{ $tr('publishHeader') }}</span>&nbsp;<span>{{ progressPercent }}</span>
    </div>
    <div
      v-else-if="isPublishingDraft"
      class="grey--text"
      data-test="progress"
    >
      <VProgressCircular
        indeterminate
        size="16"
        width="2"
        color="loading"
        class="mr-2"
      />
      <span>{{ $tr('draftHeader') }}</span>
    </div>
    <div
      v-else-if="showDraftSaved"
      class="grey--text"
    >
      {{ $tr('draftSaved') }}
    </div>
    <div
      v-else
      class="grey--text"
    >
      {{
        lastPublished && !isPublishingDraft
          ? $tr('lastPublished', { last_published: $formatRelative(lastPublished, now) })
          : $tr('unpublishedText')
      }}
    </div>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import get from 'lodash/get';
  import { TASK_ID } from 'shared/data/constants';

  export default {
    name: 'ProgressModal',
    data: () => ({
      now: Date.now(),
    }),
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'canManage']),
      ...mapGetters('task', ['getAsyncTask', 'getPublishTaskForChannel']),
      isSyncing() {
        return this.currentTask && this.currentTask.task_name === 'sync-channel';
      },
      isPublishing() {
        // add condition so that publishing modal is only visible for users
        // who have channel publishing permissions
        if (this.canManage) {
          return this.currentChannel && this.currentChannel.publishing && !this.currentChannel.publishing_draft;
        }
        return false;
      },
      isPublishingDraft() {
        if (this.canManage) {
          return this.currentChannel && this.currentChannel.publishing && this.currentChannel.publishing_draft;
        }
        return false;
      },
      showDraftSaved() {
        if (this.canManage) {
          return this.currentChannel && 
                 !this.currentChannel.publishing && 
                 !this.currentChannel.publishing_draft && 
                 this.currentChannel.last_published &&
                 !this.currentChannel.published &&
                 !this.currentTask; 
        }
        return false;
      },
      currentTask() {
        return this.getAsyncTask(this.currentChannel[TASK_ID]) || null;
      },
      progressPercent() {
        return this.$formatNumber(Math.round(get(this.currentTask, ['progress'], 0) || 0) / 100, {
          style: 'percent',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
      },
      currentPublishTaskError() {
        const publishTask = this.getPublishTaskForChannel(this.currentChannel.id);
        return Boolean(
          (publishTask && get(publishTask, ['traceback'], null)) ||
            get(publishTask, 'status') === 'FAILURE',
        );
      },
      syncError() {
        return (
          this.isSyncing &&
          (get(this.currentTask, ['traceback'], null) ||
            get(this.currentTask, 'status') === 'FAILURE')
        );
      },
      lastPublished() {
        if (!this.currentChannel.last_published) {
          return null;
        }
        const date = new Date(this.currentChannel.last_published);
        if (date > this.now) {
          return this.now;
        }
        return date;
      },
      showSyncingProgress() {
        return this.isSyncing && !this.syncError;
      },
    },
    watch: {
      showSyncingProgress: {
        handler(newValue, oldValue) {
          this.showSnackbarOnCompleteSync(newValue, oldValue);
        },
        immediate: true,
        deep: true,
      },
    },
    mounted() {
      this.timer = setInterval(() => {
        this.now = Date.now();
      }, 10000);
    },
    beforeDestroy() {
      clearInterval(this.timer);
    },
    methods: {
      ...mapActions(['showSnackbar']),
      showSnackbarOnCompleteSync(newShowProgress, oldShowProgress) {
        if (!newShowProgress && oldShowProgress) {
          this.showSnackbar({
            text: this.$tr('syncedSnackbar'),
          });
        }
      },
    },
    $trs: {
      defaultErrorText: 'Last attempt to publish failed',
      publishHeader: 'Publishing channel',
      draftHeader: 'Saving draft...',
      draftSaved: 'Saved just now',
      lastPublished: 'Published {last_published}',
      unpublishedText: 'Unpublished',
      syncHeader: 'Syncing resources',
      syncError: 'Last attempt to sync failed',
      syncedSnackbar: 'Resources synced',
    },
  };

</script>
