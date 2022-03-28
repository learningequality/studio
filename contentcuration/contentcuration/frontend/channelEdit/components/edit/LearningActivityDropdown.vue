<template>
  <VSelect
    v-model="learningActivity"
    :items="learningActivities"
    box
    chips
    clearable
    :label="$tr('learningActivityLabel')"
    multiple
    deletableChips
  >
    <template v-slot:no-data>
      <VListTile v-if="learningActivityText && learningActivityText.trim()">
        <VListTileContent>
          <VListTileTitle>
            {{ $tr('noActivitiesText', { text: learningActivityText.trim() }) }}
          </VListTileTitle>
        </VListTileContent>
      </VListTile>
    </template>
  </VSelect>
</template>

<script>
import { LearningActivities } from 'shared/constants';

export default {
  name: 'LearningActivityDropdown',
  props: {
    kind: {
      type: String,
      default: '',
    },
    selected: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      learningActivityText: null,
    };
  },
  computed: {
    learningActivity: {
      get() {
        if (this.kind === 'video') {
          console.log ('LearningActivities.WATCH', LearningActivities.WATCH)
          return LearningActivities.WATCH;
        } else if (this.kind === 'audio') {
          return LearningActivities.LISTEN;
        } else if (this.kind === 'document') {
          return LearningActivities.READ;
        } else {
          return this.selected;
        }
      },
      set(value) {
        this.$emit('input', value);
      },
    },
    learningActivities() {
      return Object.entries(LearningActivities).map((activity) => ( { text: activity[0], value: activity[1] } ));
    },
  },
  $trs: {
    learningActivityLabel: 'Learning activity',
    noActivitiesText:
      'No results found for "{text}". Press \'Enter\' key to create a new learning activity',
  },
};
</script>
<style lang="scss">
</style>
