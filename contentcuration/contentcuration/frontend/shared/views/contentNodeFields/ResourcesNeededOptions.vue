<template>

  <ExpandableSelect
    v-model="need"
    multiple
    :expanded="expanded"
    :options="resources"
    :hideLabel="hideLabel"
    :label="$tr('resourcesNeededLabel')"
    :hint="hint"
  />

</template>

<script>

  import ExpandableSelect from 'shared/views/form/ExpandableSelect';
  import { ResourcesNeededTypes, ResourcesNeededOptions } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ResourcesNeededOptions',
    components: { ExpandableSelect },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      /**
       * It can receive a value as an array of strings of the selected resouces needed, or
       * an object with the following structure:
       * {
       *  [resourceNeededId]: true | [nodeId1, nodeId2, ...]
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
      need: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      resources() {
        return ResourcesNeededOptions.map(key => ({
          text: this.translateMetadataString(key),
          value: ResourcesNeededTypes[key],
        }));
      },
      hint() {
        if (Array.isArray(this.value) && this.value.includes(ResourcesNeededTypes.OTHER_SUPPLIES)) {
          return this.$tr('furtherExplanation');
        }
        if (this.value && this.value[ResourcesNeededTypes.OTHER_SUPPLIES]) {
          return this.$tr('furtherExplanation');
        }
        return '';
      },
    },
    $trs: {
      resourcesNeededLabel: 'Requirements',
      furtherExplanation:
        "Please add to the 'Description' field any additional supplies learners will need in order to use this resource",
    },
  };

</script>
<style lang="less">

</style>
