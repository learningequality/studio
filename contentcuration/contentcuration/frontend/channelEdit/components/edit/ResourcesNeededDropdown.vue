<template>

  <VSelect
    ref="need"
    v-model="need"
    :items="resources"
    box
    chips
    :label="$tr('learnerNeedsLabel')"
    multiple
    deletableChips
    clearable
  >
    <template v-slot:no-data>
      <VListTile v-if="learnerNeedsText && learnerNeedsText.trim()">
        <VListTileContent>
          <VListTileTitle>
            {{ $tr('noNeedsFoundText', { text: learnerNeedsText.trim() }) }}
          </VListTileTitle>
        </VListTileContent>
      </VListTile>
    </template>
  </VSelect>

</template>

<script>
  import { ResourcesNeededTypes } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ResourcesNeededDropdown',
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    data() {
      return {
        learnerNeedsText: null,
      };
    },
    computed: {
      need: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      resources() {
        return Object.entries(ResourcesNeededTypes).map(resource => ( {
          text: this.translateMetadataString(resource[0]),
          value: resource[1]
        }));
      },
    },
    $trs: {
      learnerNeedsLabel: 'What you will need',
      noNeedsFoundText:
        'No results found for "{text}". Press \'Enter\' key to specify a new item learners will need',
    },
  };

</script>
<style lang="scss">

</style>
