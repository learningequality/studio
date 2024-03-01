<template>

  <div>
    <slot name="prependOptions" />
    <ExpandableSelect
      v-model="level"
      multiple
      :expanded="expanded"
      :options="levels"
      :hideLabel="hideLabel"
      :label="translateMetadataString('level')"
    />
  </div>

</template>

<script>

  import camelCase from 'lodash/camelCase';
  import { ContentLevels } from 'shared/constants';
  import ExpandableSelect from 'shared/views/form/ExpandableSelect';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'LevelsOptions',
    components: { ExpandableSelect },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      value: {
        type: Array,
        default: () => [],
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
      level: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      /**
       * List of levels to show in the dropdown, taking into account mapping
       * to levels in the constants that do not have an exact matching corresponding string
       * @returns {Array}
       */
      levels() {
        return Object.entries(ContentLevels).map(level => {
          let translationKey;
          if (level[0] === 'PROFESSIONAL') {
            translationKey = 'specializedProfessionalTraining';
          } else if (level[0] === 'WORK_SKILLS') {
            translationKey = 'allLevelsWorkSkills';
          } else if (level[0] === 'BASIC_SKILLS') {
            translationKey = 'allLevelsBasicSkills';
          } else {
            translationKey = camelCase(level[0]);
          }
          return {
            text: this.translateMetadataString(translationKey),
            value: level[1],
          };
        });
      },
    },
  };

</script>
<style lang="less" scoped>

</style>
