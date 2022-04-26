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

  //the variable below can be changed or removed when metadata/Kolibri is updated
  const keysToBeTemporarilyRemoved = ['PEERS', 'TEACHER', 'PRIOR_KNOWLEDGE', 'MATERIALS'];
  const dropdown = updateResourcesDropdown(keysToBeTemporarilyRemoved) || ResourcesNeededTypes;

  /**
   * @param {array} listOfKeys
   * @returns {Object}
   *
   * Determines resources to show in the dropdown, to remove resources
   * that do not currently need to be displayed in Kolibri
   */
  function updateResourcesDropdown(listOfKeys) {
    if (listOfKeys) {
      return Object.keys(ResourcesNeededTypes).reduce((acc, key) => {
        if (listOfKeys.indexOf(key) === -1) {
          acc[key] = ResourcesNeededTypes[key];
        }
        return acc;
      }, {});
    }
  }
  export const exportedForTesting = {
    updateResourcesDropdown,
  };
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
        return Object.entries(dropdown).map(resource => ({
          text: this.translateMetadataString(resource[0]),
          value: resource[1],
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
