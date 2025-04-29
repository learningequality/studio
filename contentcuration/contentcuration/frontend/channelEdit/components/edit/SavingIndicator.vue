<template>

  <div class="mx-2">
    <template v-if="hasChanges">
      <VProgressCircular
        indeterminate
        size="16"
        width="2"
        color="loading"
      />
      <span
        class="mx-2"
        style="vertical-align: middle"
      >
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

  const CHECK_SAVE_INTERVAL = 2000;
  const UPDATE_LAST_SAVED_INTERVAL = 10000;

  export default {
    name: 'SavingIndicator',
    props: {
      nodeIds: {
        type: Array,
        default: null,
      },
    },
    data() {
      return {
        hasNodeChanges: false,
        isSaving: false,
        lastSaved: null,
        lastSavedText: '',
        interval: null,
        updateLastSavedInterval: null,
      };
    },
    computed: {
      ...mapGetters('file', ['getContentNodeFiles']),
      ...mapGetters('assessmentItem', ['getAssessmentItems']),
      ...mapGetters(['areAllChangesSaved']),
      hasChanges() {
        if (this.nodeIds) {
          return this.hasNodeChanges;
        }
        return !this.areAllChangesSaved;
      },
    },
    watch: {
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
      if (this.nodeIds) {
        this.interval = setInterval(() => {
          const files = flatten(this.nodeIds.map(this.getContentNodeFiles));
          const assessmentItems = flatten(this.nodeIds.map(this.getAssessmentItems));
          this.checkSavingProgress({
            contentNodeIds: this.nodeIds,
            fileIds: files.map(f => f.id).filter(Boolean),
            assessmentIds: assessmentItems
              .map(ai => [ai.contentnode, ai.assessment_id])
              .filter(Boolean),
          }).then(hasChanges => (this.hasNodeChanges = hasChanges));
        }, CHECK_SAVE_INTERVAL);
      }
    },
    beforeDestroy() {
      if (this.interval) {
        clearInterval(this.interval);
      }
      if (this.updateLastSavedInterval) {
        clearInterval(this.updateLastSavedInterval);
      }
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


<style lang="scss" scoped></style>
