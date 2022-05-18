<template>

  <div class="mx-2">
    <template v-if="hasChanges">
      <VProgressCircular indeterminate size="16" width="2" color="secondary" />
      <span class="mx-2" style="vertical-align: middle;">
        {{ $tr('savingIndicator') }}
      </span>
    </template>
    <span v-else-if="lastSavedText">
      {{ lastSavedText }}
    </span>
  </div>

</template>

<script>

  import flatten from 'lodash/flatten';
  import { mapActions, mapGetters } from 'vuex';
  import useContentNodesFiles from 'shared/composables/useContentNodesFiles';

  const CHECK_SAVE_INTERVAL = 2000;
  const UPDATE_LAST_SAVED_INTERVAL = 10000;

  export default {
    name: 'SavingIndicator',
    props: {
      nodeIds: {
        type: Array,
        default: () => [],
      },
    },
    setup() {
      const { subscribeContentNodesFiles, contentNodesFiles } = useContentNodesFiles();
      return { subscribeContentNodesFiles, contentNodesFiles };
    },
    data() {
      return {
        hasChanges: false,
        isSaving: false,
        lastSaved: null,
        lastSavedText: '',
        interval: null,
        updateLastSavedInterval: null,
      };
    },
    computed: {
      ...mapGetters('assessmentItem', ['getAssessmentItems']),
    },
    watch: {
      nodeIds(newNodeIds) {
        this.subscribeContentNodesFiles(newNodeIds);
      },
      hasChanges(hasChanges) {
        if (hasChanges) {
          this.isSaving = true;
        } else {
          this.isSaving = false;
          this.lastSaved = new Date();
          this.lastSavedText = this.$tr('savedNow');
          clearInterval(this.updateLastSavedInterval);
          this.updateLastSavedInterval = setInterval(() => {
            this.lastSavedText = this.$tr('lastSaved', {
              saved: this.$formatRelative(this.lastSaved, { now: new Date() }),
            });
          }, UPDATE_LAST_SAVED_INTERVAL);
        }
      },
    },
    mounted() {
      this.subscribeContentNodesFiles(this.nodeIds);
      this.interval = setInterval(() => {
        const assessmentItems = flatten(this.nodeIds.map(this.getAssessmentItems));
        this.checkSavingProgress({
          contentNodeIds: this.nodeIds,
          fileIds: this.contentNodesFiles.map(f => f.id).filter(Boolean),
          assessmentIds: assessmentItems
            .map(ai => [ai.contentnode, ai.assessment_id])
            .filter(Boolean),
        }).then(hasChanges => (this.hasChanges = hasChanges));
      }, CHECK_SAVE_INTERVAL);
    },
    beforeDestroy() {
      clearInterval(this.interval);
      clearInterval(this.updateLastSavedInterval);
    },
    methods: {
      ...mapActions('contentNode', ['checkSavingProgress']),
    },
    $trs: {
      savingIndicator: 'Saving...',
      lastSaved: 'Saved {saved}',
      savedNow: 'Saved just now',
    },
  };

</script>

<style lang="less" scoped>

</style>
