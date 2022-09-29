<template>

  <div class="resources-needed-container">
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
      :menu-props="{ offsetY: true, lazy: true, zIndex: 4 }"
      :attach="$attrs.id ? `#${$attrs.id}` : '.resources-needed-container'"
    />
  </div>

</template>

<script>

  import { ResourcesNeededTypes } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  const dropdownItems = [
    'PEERS',
    'TEACHER',
    'INTERNET',
    'SPECIAL_SOFTWARE',
    'PAPER_PENCIL',
    'OTHER_SUPPLIES',
  ];

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
        return dropdownItems.map(key => ({
          text: this.translateMetadataString(key),
          value: ResourcesNeededTypes[key],
        }));
      },
    },
    $trs: {
      resourcesNeededLabel: 'Requirements',
    },
  };

</script>
<style lang="less">

  .resources-needed-container {
    position: relative;
  }

</style>
