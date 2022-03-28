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
  data() {
    return {
      learningActivityText: null,
    };
  },
  computed: {
    learningActivity: {
      get() {
        return this.value;
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
