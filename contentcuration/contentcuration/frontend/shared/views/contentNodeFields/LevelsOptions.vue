<template>

  <ExpandableSelect
    v-model="level"
    multiple
    :expanded="expanded"
    :options="levels"
    :hideLabel="hideLabel"
    :label="translateMetadataString('level')"
  />

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
      /**
       * It can receive a value as an array of strings of the selected levels, or
       * an object with the following structure:
       * {
       *  [levelId]: true | [nodeId1, nodeId2, ...]
       * }
       * If the value is true, it means that the option is selected for all nodes
       * If the value is an array of nodeIds, it means that the option is selected
       * just for those nodes
       */
      value: {
        type: [Array, Object],
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
