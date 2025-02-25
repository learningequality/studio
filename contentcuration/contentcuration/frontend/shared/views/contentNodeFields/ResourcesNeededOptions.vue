<template>

  <ExpandableSelect
    v-model="need"
    multiple
    :expanded="expanded"
    :options="resources"
    :hideLabel="hideLabel"
    :label="$tr('resourcesNeededLabel')"
    :hint="hint"
    :availableItems="nodeIds"
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
       * This prop receives an object with the following structure:
       * {
       *  [resourceId]: [nodeId1, nodeId2, ...]
       * }
       * Where nodeId is the id of the node that has the resource selected
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


<style lang="scss"></style>
