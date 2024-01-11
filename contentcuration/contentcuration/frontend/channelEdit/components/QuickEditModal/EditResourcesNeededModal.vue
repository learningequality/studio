<template>

  <KModal
    :title="$tr('editResourcesNeededTitle')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-resources-needed-modal"
    @submit="handleSave"
    @cancel="close"
  >
    <p data-test="resources-selected-message">
      {{ $tr('resourcesSelected', { count: nodeIds.length }) }}
    </p>
    <template v-if="isTopicSelected">
      <KCheckbox
        v-model="updateDescendants"
        data-test="update-descendants-checkbox"
        :label="$tr('updateDescendantsCheckbox')"
      />
      <hr
        :style="dividerStyle"
      >
    </template>
    <div
      data-test="requirements-options-list"
    >
      <KCheckbox
        v-for="resource in resourcesOptions"
        :key="resource.value"
        data-test="category-checkbox"
        :label="resource.label"
        :checked="isCheckboxSelected(resource)"
        :indeterminate="isCheckboxIndeterminate(resource)"
        @change="value => onSelectResource(resource, value)"
      />
    </div>
  </KModal>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { ResourcesNeededTypes, ResourcesNeededOptions } from 'shared/constants';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'EditLanguageModal',
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    mixins: [metadataTranslationMixin],
    data() {
      return {
        updateDescendants: false,
        /**
         * selectedResources is an object with the following structure:
         * {
         *  [resource]: true | [nodeId1, nodeId2, ...]
         * }
         * If the value is true, it means that the resource is selected for all nodes
         * If the value is an array of nodeIds, it means that the resource is selected
         * just for those nodes
         */
        selectedResources: {},
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodes']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      isTopicSelected() {
        return this.nodes.some(node => node.kind === ContentKindsNames.TOPIC);
      },
      resourcesOptions() {
        return ResourcesNeededOptions.map(key => ({
          label: this.translateMetadataString(key),
          value: ResourcesNeededTypes[key],
        }));
      },
      dividerStyle() {
        return {
          border: 0,
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          margin: '1em 0',
        };
      },
    },
    created() {
      const resourcesNodes = {};
      this.nodes.forEach(node => {
        Object.entries(node.learner_needs || {})
          .filter(entry => entry[1] === true)
          .forEach(([resource]) => {
            resourcesNodes[resource] = resourcesNodes[resource] || [];
            resourcesNodes[resource].push(node.id);
          });
      });
      console.log("resourcesNodes", resourcesNodes);
      Object.entries(resourcesNodes).forEach(([key, nodeIds]) => {
        if (nodeIds.length === this.nodeIds.length) {
          this.selectedResources[key] = true;
        } else {
          this.selectedResources[key] = nodeIds;
        }
      });
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      close() {
        this.$emit('close');
      },
      isCheckboxSelected(resource) {
        return (
          this.selectedResources[resource.value] &&
          this.selectedResources[resource.value] === true
        )
      },
      isCheckboxIndeterminate(resource) {
        return (
          this.selectedResources[resource.value] &&
          this.selectedResources[resource.value] !== true
        )
      },
      onSelectResource(resource, value) {
        if (value) {
          this.selectedResources = {
            ...this.selectedResources,
            [resource.value]: true,
          };
        } else {
          const newSelectedResources = { ...this.selectedResources };
          delete newSelectedResources[resource.value];
          this.selectedResources = newSelectedResources;
        }
      },
      async handleSave() {
        await Promise.all(
          this.nodes.map(node => {
            const resources = {};
            Object.entries(this.selectedResources).forEach(([key, value]) => {
              if (value === true || value.includes(node.id)) {
                resources[key] = true;
              }
            });
            if (this.updateDescendants && node.kind === ContentKindsNames.TOPIC) {
              // will update with the new function to update all descendants
              return this.updateContentNode({
                id: node.id,
                learner_needs: resources,
              });
            }
            return this.updateContentNode({
              id: node.id,
              learner_needs: resources,
            });
          })
        );
        this.$store.dispatch(
          'showSnackbarSimple',
          this.$tr('editedResourcesNeeded', { count: this.nodes.length })
        );
        this.close();
      },
    },
    $trs: {
      editResourcesNeededTitle: 'What will you need?',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      editedResourcesNeeded:
        'Edited \'what will you need\' for {count, number, integer} {count, plural, one {resource} other {resources}}',
      selectLanguage: 'Select / Type Language',
      resourcesSelected:
        '{count, number, integer} {count, plural, one {resource} other {resources}} selected',
      differentLanguages:
        'The selected resources have different languages set. Choosing an option below will apply the language to all the selected resources',
      updateDescendantsCheckbox:
        'Apply to all resources and folders nested within the selected folders',
    },
  };

</script>

<style scoped>
</style>