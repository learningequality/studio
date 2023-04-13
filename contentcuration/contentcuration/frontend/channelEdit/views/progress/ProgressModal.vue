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
      <Icon
        small
        color="red"
      >
        error
      </Icon>
      {{ $tr('syncError') }}
    </div>
    <div
      v-else-if="currentPublishTaskError"
      class="red--text"
    >
      <Icon
        small
        color="red"
      >
        error
      </Icon>
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
      v-else
      class="grey--text"
    >
      {{ lastPublished ?
        $tr('lastPublished', { last_published: $formatRelative(lastPublished, now) }) :
        $tr('unpublishedText')
      }}
    </div>
  </div>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import get from 'lodash/get';
  import { ContentNode } from 'shared/data/resources';
  import { TASK_ID } from 'shared/data/constants';

  export default {
    name: 'ProgressModal',
    data: () => ({
      now: Date.now(),
    }),
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      ...mapGetters('currentChannel', ['currentChannel', 'canManage', 'rootId']),
      ...mapGetters('task', ['getAsyncTask', 'getPublishTaskForChannel']),
      isSyncing() {
        //console.log(this.currentTask);
        return this.currentTask && this.currentTask.task_name === 'sync-channel';
      },
      isPublishing() {
        // add condition so that publishing modal is only visible for users
        // who have channel publishing permissions
        if (this.canManage) {
          return this.currentChannel && this.currentChannel.publishing;
        }
        return false;
      },
      currentTask() {
        return this.getAsyncTask(this.currentChannel[TASK_ID]) || null;
      },
      nodeId() {
        return get(this.getContentNode(this.rootId), ['id'], null);
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
            get(publishTask, 'status') === 'FAILURE'
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
        handler(newValue) {
          this.showSnackbarOnCompleteSync(newValue);
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
      showSnackbarOnCompleteSync(showProgress) {
        if (showProgress && this.nodeId) {
          ContentNode.waitForCopying([this.nodeId]).then(() => {
            this.showSnackbar({
              text: this.$tr('syncedSnackbar'),
            });
          });
        }
      },
    },
    $trs: {
      defaultErrorText: 'Last attempt to publish failed',
      publishHeader: 'Publishing channel',
      lastPublished: 'Published {last_published}',
      unpublishedText: 'Unpublished',
      syncHeader: 'Syncing resources',
      syncError: 'Last attempt to sync failed',
      syncedSnackbar: 'Resources synced',
    },
  };

</script>
