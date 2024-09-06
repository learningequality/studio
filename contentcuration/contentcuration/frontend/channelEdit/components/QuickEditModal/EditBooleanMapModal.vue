<template>

  <KModal
    :title="title"
    :submitText="error ? null : $tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-booleanMap-modal"
    @submit="handleSave"
    @cancel="close"
  >
    <p v-if="resourcesSelectedText.length > 0" data-test="resources-selected-message">
      {{ resourcesSelectedText }}
    </p>
    <template v-if="isDescendantsUpdatable && isTopicSelected">
      <KCheckbox
        :checked="updateDescendants"
        data-test="update-descendants-checkbox"
        :label="$tr('updateDescendantCheckbox')"
        @change="(value) => { updateDescendants = value }"
      />
      <Divider />
    </template>
    <slot
      name="input"
      :value="selectedValues"
      :inputHandler="(value) => { selectedValues = value }"
    ></slot>

    <!-- <span v-if="error" class="red--text">
      {{ error }}
    </span> -->
  </KModal>

</template>


<script>

  /**
   * EditBooleanMapModal
   * This component is a modal responsible for reusing the logic of saving
   * the edition of a boolean map field for multiple nodes.
   */
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
      resourcesSelectedText: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        updateDescendants: false,
        error: '',
        /**
         * selectedValues is an object with the following structure:
         * {
         *  [optionId]: [nodeId1, nodeId2, ...]
         * }
         * Where nodeIds is the id of the nodes that have the option selected
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
    },
    watch: {
      selectedValues() {
        this.validate();
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

      this.selectedValues = optionsNodes;
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
            Object.keys(this.selectedValues).filter(
              key => this.selectedValues[key].length === this.nodes.length
            )
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
              if (value.includes(node.id)) {
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
      updateDescendantCheckbox:
        'Apply to all resources, folders, and subfolders contained within the selected folders.',
    },
  };

</script>

<style scoped>
</style>
