<template>

  <KModal
    :title="title"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-booleanMap-modal"
    @submit="handleSave"
    @cancel="close"
  >
    <p data-test="resources-selected-message">
      {{ $tr('resourcesSelected', { count: nodeIds.length }) }}
    </p>
    <component
      :is="inputComponent"
      v-model="selectedValues"
      expanded
      hideLabel
      :nodeIds="nodeIds"
    >
      <template v-if="isDescendantsUpdatable && isTopicSelected" #prependOptions>
        <KCheckbox
          :checked="updateDescendants"
          data-test="update-descendants-checkbox"
          :label="$tr('updateDescendantsCheckbox')"
          @change="(value) => { updateDescendants = value }"
        />
        <hr
          :style="dividerStyle"
        >
      </template>
    </component>
  </KModal>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { getInvalidText } from 'shared/utils/validation';

  export default {
    name: 'EditBooleanMapModal',
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
      field: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      isDescendantsUpdatable: {
        type: Boolean,
        default: false,
      },
      confirmationMessage: {
        type: String,
        required: true,
      },
      validators: {
        type: Array,
        default: () => [],
      },
      inputComponent: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        updateDescendants: false,
        error: '',
        /**
         * selectedValues is an object with the following structure:
         * {
         *  [optionId]: true | [nodeId1, nodeId2, ...]
         * }
         * If the value is true, it means that the option is selected for all nodes
         * If the value is an array of nodeIds, it means that the option is selected
         * just for those nodes
         */
        selectedValues: {},
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
      dividerStyle() {
        return {
          border: 0,
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          margin: '1em 0',
        };
      },
    },
    created() {
      const optionsNodes = {};

      this.nodes.forEach(node => {
        Object.entries(node[this.field] || {})
          .filter(entry => entry[1] === true)
          .forEach(([optionId]) => {
            optionsNodes[optionId] = optionsNodes[optionId] || [];
            optionsNodes[optionId].push(node.id);
          });
      });

      Object.entries(optionsNodes).forEach(([key, nodeIds]) => {
        if (nodeIds.length === this.nodeIds.length) {
          this.selectedValues[key] = true;
        } else {
          this.selectedValues[key] = nodeIds;
        }
      });
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode', 'updateContentNodeDescendants']),
      close() {
        this.$emit('close');
      },
      validate() {
        if (this.validators && this.validators.length) {
          this.error = getInvalidText(
            this.validators,
            Object.keys(this.selectedValues).filter(key => this.selectedValues[key] === true)
          );
        } else {
          this.error = '';
        }
      },
      async handleSave() {
        this.validate();
        if (this.error) {
          return;
        }

        await Promise.all(
          this.nodes.map(node => {
            const fieldValue = {};
            Object.entries(this.selectedValues).forEach(([key, value]) => {
              if (value === true || value.includes(node.id)) {
                fieldValue[key] = true;
              }
            });
            if (this.updateDescendants && node.kind === ContentKindsNames.TOPIC) {
              return this.updateContentNodeDescendants({
                id: node.id,
                [this.field]: fieldValue,
              });
            }
            return this.updateContentNode({
              id: node.id,
              [this.field]: fieldValue,
            });
          })
        );
        this.$store.dispatch('showSnackbarSimple', this.confirmationMessage || '');
        this.close();
      },
    },
    $trs: {
      saveAction: 'Save',
      cancelAction: 'Cancel',
      resourcesSelected:
        '{count, number, integer} {count, plural, one {resource} other {resources}} selected',
      updateDescendantsCheckbox:
        'Apply to all resources and folders nested within the selected folders',
    },
  };

</script>

<style scoped>
</style>
