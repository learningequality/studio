<template>

  <div>
    <slot name="prependOptions"></slot>
    <ExpandableSelect
      v-model="need"
      multiple
      :expanded="expanded"
      :options="resources"
      :hideLabel="hideLabel"
      :label="$tr('resourcesNeededLabel')"
      :hint="hint"
    />
  </div>

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
