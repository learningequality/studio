<template>

  <ExpandableSelect
    v-model="learningActivity"
    multiple
    :disabled="disabled"
    :expanded="expanded"
    :options="learningActivities"
    :hideLabel="hideLabel"
    :rules="learningActivityRules"
    :label="translateMetadataString('learningActivity')"
  />

</template>

<script>

  import camelCase from 'lodash/camelCase';
  import { LearningActivities } from 'shared/constants';
  import ExpandableSelect from 'shared/views/form/ExpandableSelect';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';
  import { getLearningActivityValidators, translateValidator } from 'shared/utils/validation';

  export default {
    name: 'LearningActivityOptions',
    components: { ExpandableSelect },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      /**
       * It can receive a value as an array of strings of the selected learning activities, or
       * an object with the following structure:
       * {
       *  [learningActivityId]: true | [nodeId1, nodeId2, ...]
       * }
       * If the value is true, it means that the option is selected for all nodes
       * If the value is an array of nodeIds, it means that the option is selected
       * just for those nodes
       */
      value: {
        type: [Array, Object],
        default: () => [],
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      expanded: {
        type: Boolean,
        default: false,
      },
      hideLabel: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      learningActivity: {
        get() {
          if (!this.disabled) {
            return this.value;
          }
          return null;
        },
        set(value) {
          if (!this.disabled) {
            this.$emit('input', value);
          }
        },
      },
      learningActivities() {
        return Object.entries(LearningActivities).map(activity => ({
          text: this.translateMetadataString(camelCase(activity[0])),
          value: activity[1],
        }));
      },
      learningActivityRules() {
        return this.disabled ? [] : getLearningActivityValidators().map(translateValidator);
      },
    },
  };

</script>
<style lang="less" scoped>

</style>
