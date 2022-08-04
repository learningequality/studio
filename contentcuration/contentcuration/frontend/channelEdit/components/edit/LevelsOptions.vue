<template>

  <div class="levels-container">
    <VSelect
      ref="level"
      v-model="level"
      :items="levels"
      box
      chips
      clearable
      :label="translateMetadataString('level')"
      multiple
      deletableChips
      :menu-props="{ offsetY: true, lazy: true, zIndex: 4 }"
      :attach="$attrs.id ? `#${$attrs.id}` : '.levels-container'"
    />
  </div>

</template>

<script>

  import camelCase from 'lodash/camelCase';
  import { ContentLevels } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'LevelsOptions',
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      value: {
        type: Array,
        default: () => [],
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

  .levels-container {
    position: relative;
  }

</style>
