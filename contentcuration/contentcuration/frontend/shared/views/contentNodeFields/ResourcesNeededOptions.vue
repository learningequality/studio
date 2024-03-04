<template>

  <DropdownWrapper>
    <template #default="{ attach, menuProps }">
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
        :menu-props="menuProps"
        :attach="attach"
        :hint="hint"
        persistent-hint
      />
    </template>
  </DropdownWrapper>

</template>

<script>

  import { ResourcesNeededTypes, ResourcesNeededOptions } from 'shared/constants';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  export default {
    name: 'ResourcesNeededOptions',
    components: { DropdownWrapper },
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
        return ResourcesNeededOptions.map(key => ({
          text: this.translateMetadataString(key),
          value: ResourcesNeededTypes[key],
        }));
      },
      hint() {
        return this.value && this.value.includes(ResourcesNeededTypes.OTHER_SUPPLIES)
          ? this.$tr('furtherExplanation')
          : '';
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
