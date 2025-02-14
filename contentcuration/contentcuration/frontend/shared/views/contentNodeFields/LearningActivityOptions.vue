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
    :availableItems="nodeIds"
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
       * This prop receives an object with the following structure:
       * {
       *  [learningActivityId]: [nodeId1, nodeId2, ...]
       * }
       * Where nodeId is the id of the node that has the learning activity selected
       */
      value: {
        type: Object,
        required: true,
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
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    computed: {
      learningActivity: {
        get() {
          if (!this.disabled) {
            return this.value;
          }
          return {};
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
<style lang="scss" scoped>

</style>
