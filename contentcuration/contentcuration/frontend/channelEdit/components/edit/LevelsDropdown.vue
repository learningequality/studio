<template>

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
  >
    <template v-slot:no-data>
      <VListTile v-if="levelText && levelText.trim()">
        <VListTileContent>
          <VListTileTitle>
            {{ $tr('noLevelsFoundText', { text: levelText.trim() }) }}
          </VListTileTitle>
        </VListTileContent>
      </VListTile>
    </template>
  </VSelect>

</template>

<script>

  import { camelCase } from 'lodash';
  import { ContentLevels } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'LevelsDropdown',
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    data() {
      return {
        levelText: null,
      };
    },
    computed: {
      level: {
        get() {
          return this.value;
        },
        set(value) {
          console.log('newMap value', value)
          this.$emit('input', value);
        },
      },
      /**
       * List of levels to show in the dropdown, taking into account mapping
       * to levels in the constantsthat do not have an exact matching corresponding string
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
    $trs: {
      noLevelsFoundText: 'No results found for "{text}". Press \'Enter\' key to create a new level',
    },
  };

</script>
<style lang="scss">

</style>
