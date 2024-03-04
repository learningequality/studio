<template>

  <div>
    <slot name="prependOptions"></slot>
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
  </div>

</template>

<script>

  import camelCase from 'lodash/camelCase';
  import { LearningActivities } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';
  import { getLearningActivityValidators, translateValidator } from 'shared/utils/validation';
  import ExpandableSelect from 'shared/views/form/ExpandableSelect';

  export default {
    name: 'LearningActivityOptions',
    components: { ExpandableSelect },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      value: {
        type: Array,
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
