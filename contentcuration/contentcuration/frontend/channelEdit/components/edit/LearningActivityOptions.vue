<template>

  <VSelect
    v-model="learningActivity"
    :items="learningActivities"
    box
    chips
    clearable
    :label="translateMetadataString('learningActivity')"
    multiple
    deletableChips
    :rules="learningActivityRules"
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

  import { camelCase } from 'lodash';
  import { LearningActivities } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';
  import { getLearningActivityValidators, translateValidator } from 'shared/utils/validation';

  export default {
    name: 'LearningActivityOptions',
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      kind: {
        type: String,
        default: '',
      },
      value: {
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
            return this.value || [LearningActivities.WATCH];
          } else if (this.kind === 'document') {
            return this.value || [LearningActivities.READ];
          } else if (this.kind === 'audio') {
            return this.value || [LearningActivities.LISTEN];
          }
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      learningActivities() {
        return Object.entries(LearningActivities).map(activity => ({
          text: this.translateMetadataString(camelCase(activity[0])),
          value: activity[1],
        }));
      },
      learningActivityRules() {
        return getLearningActivityValidators().map(translateValidator);
      },
    },
    $trs: {
      noActivitiesText:
        'No results found for "{text}". Press \'Enter\' key to create a new learning activity',
    },
  };

</script>
<style lang="scss">
</style>
