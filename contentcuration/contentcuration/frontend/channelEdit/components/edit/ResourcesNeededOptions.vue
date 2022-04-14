<template>

  <VSelect
    ref="need"
    v-model="need"
    :items="resources"
    box
    chips
    :label="$tr('resourcesNeededLabel')"
    multiple
    deletableChips
    clearable
  />

</template>

<script>
  import { ResourcesNeededTypes } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ResourcesNeededOptions',
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      value: {
        type: Array,
        default: () => [],
      },
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
      resourcesNeededLabel: 'What you will need',
    },
  };

</script>
<style lang="scss">

</style>
