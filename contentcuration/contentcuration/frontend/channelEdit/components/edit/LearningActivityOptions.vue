<template>

  <div class="learning-activity-container">
    <VSelect
      v-model="learningActivity"
      :items="learningActivities"
      box
      chips
      clearable
      :label="translateMetadataString('learningActivity')"
      multiple
      deletableChips
      :menu-props="{offsetY: true, lazy: true, zIndex: 4}"
      :rules="learningActivityRules"
      :attach="$attrs.id ? `#${$attrs.id}` : '.learning-activity-container'"
    />
  </div>

</template>

<script>

  import camelCase from 'lodash/camelCase';
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
<style lang="less" scoped>
  .learning-activity-container {
    position: relative;
  }
</style>
