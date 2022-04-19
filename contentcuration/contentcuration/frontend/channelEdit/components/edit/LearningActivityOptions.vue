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
  />

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
      value: {
        type: Array,
        default: () => [],
      },
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
        return Object.entries(LearningActivities).map(activity => ({
          text: this.translateMetadataString(camelCase(activity[0])),
          value: activity[1],
        }));
      },
      learningActivityRules() {
        return getLearningActivityValidators().map(translateValidator);
      },
    },
  };

</script>
<style lang="scss">
</style>
