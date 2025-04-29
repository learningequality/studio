<template>

  <ExpandableSelect
    v-model="level"
    multiple
    :expanded="expanded"
    :options="levels"
    :hideLabel="hideLabel"
    :label="translateMetadataString('level')"
    :availableItems="nodeIds"
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
       * This prop receives an object with the following structure:
       * {
       *  [levelId]: [nodeId1, nodeId2, ...]
       * }
       * Where nodeId is the id of the node that has the level selected
       */
      value: {
        type: Object,
        required: true,
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


<style lang="scss" scoped></style>
