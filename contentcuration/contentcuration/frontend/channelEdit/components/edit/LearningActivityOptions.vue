<template>

  <DropdownWrapper>
    <template #default="{ attach, menuProps }">
      <VSelect
        v-model="learningActivity"
        :items="learningActivities"
        :disabled="disabled"
        box
        chips
        clearable
        :label="translateMetadataString('learningActivity')"
        multiple
        deletableChips
        :menu-props="menuProps"
        :rules="learningActivityRules"
        :attach="attach"
      />
    </template>
  </DropdownWrapper>

</template>

<script>

  import camelCase from 'lodash/camelCase';
  import { LearningActivities } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';
  import { getLearningActivityValidators, translateValidator } from 'shared/utils/validation';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  export default {
    name: 'LearningActivityOptions',
    components: { DropdownWrapper },
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
