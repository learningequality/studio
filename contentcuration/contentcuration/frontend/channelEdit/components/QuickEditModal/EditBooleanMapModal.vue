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
    <VAutocomplete
      v-if="showAutocomplete"
      :value="autocompleteValues"
      :items="autocompleteOptions"
      :searchInput.sync="searchQuery"
      :label="autocompleteLabel"
      box
      clearable
      chips
      deletableChips
      multiple
      item-value="value"
      item-text="label"
      data-test="options-autocomplete"
      :menu-props="{ height: 0, maxHeight: 0 } /* hide menu */"
      @input="autocompleteInputUpdate"
    >
      <template #selection="data">
        <VTooltip top lazy>
          <template #activator="{ on, attrs }">
            <VChip
              v-bind="attrs"
              :close="!data.item.undeletable"
              data-test="option-chip"
              v-on="on"
              @input="setOption(data.item.value, false)"
            >
              {{ data.item.label }}
            </VChip>
          </template>
          <div>
            <div>{{ tooltipText(data.item.value) }}</div>
          </div>
        </VTooltip>
      </template>
    </VAutocomplete>
    <template v-if="isDescendantsUpdatable && isTopicSelected">
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
    <div :style="optionsListStyle">
      <KCheckbox
        v-for="option in filteredOptions"
        :key="option.value"
        data-test="option-checkbox"
        :label="option.label"
        :style="treeItemStyle(option.value)"
        :checked="isCheckboxSelected(option.value)"
        :indeterminate="isCheckboxIndeterminate(option.value)"
        @change="value => setOption(option.value, value)"
      />
      <p
        v-if="!filteredOptions.length"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ emptyText || $tr('emptyOptionsSearch') }}
      </p>
    </div>
    <span v-if="error" class="red--text">
      {{ error }}
    </span>
  </KModal>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { getInvalidText } from 'shared/utils/validation';

  const MIXED = 'mixed';

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
      options: {
        type: Array,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      showAutocomplete: {
        type: Boolean,
        default: false,
      },
      autocompleteLabel: {
        type: String,
        default: '',
      },
      showHierarchy: {
        type: Boolean,
        default: false,
      },
      /**
       * If the options are hierarchical, this function should return true if the first value
       * is a sublevel of the second value
       */
      isSubLevel: {
        type: Function,
        default: (value1, value2) => value1.startsWith(value2),
      },
      /**
       * If the options are hierarchical, this function should return the level of the option
       */
      getLevel: {
        type: Function,
        default: value => value.split('.').length,
      },
      isDescendantsUpdatable: {
        type: Boolean,
        default: false,
      },
      optionsListStyle: {
        type: Object,
        default: () => ({}),
      },
      emptyText: {
        type: String,
        default: '',
      },
      confirmationMessage: {
        type: String,
        required: true,
      },
      validators: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        updateDescendants: false,
        searchQuery: '',
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
      filteredOptions() {
        const searchQuery = this.searchQuery?.trim().toLowerCase();
        if (!this.searchQuery) {
          return this.options;
        }
        return this.options.filter(option => option.label.toLowerCase().includes(searchQuery));
      },
      flatList() {
        if (!this.showHierarchy) {
          return true;
        }
        return this.searchQuery && this.searchQuery.trim().length > 0;
      },
      dividerStyle() {
        return {
          border: 0,
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          margin: '1em 0',
        };
      },
      autocompleteOptions() {
        return [
          {
            value: MIXED,
            label: this.$tr('mixedLabel'),
            undeletable: true,
          },
          ...this.options,
        ];
      },
      autocompleteValues() {
        const selectedValues = Object.entries(this.selectedValues)
          .filter(entry => entry[1] === true) // no mixed values
          .map(([key]) => key);
        if (Object.values(this.selectedValues).some(value => value !== true)) {
          selectedValues.push(MIXED);
        }
        return selectedValues;
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
      isCheckboxSelected(optionId) {
        // If the value is truthy (true or an array of nodeIds) then
        // it is selected just if it is true (not an array)
        if (this.selectedValues[optionId]) {
          return this.selectedValues[optionId] === true;
        }
        // If we dont want to show a hierarchy, then we dont need to
        // look further
        if (!this.showHierarchy) {
          return false;
        }

        // If we are showing a hierarchy, then we need to check if any
        // of the children options are selected or indeterminate
        const childrenOptionsValues = Object.keys(this.selectedValues)
          .filter(selectedValue => this.isSubLevel(selectedValue, optionId))
          .map(selectedValue => this.selectedValues[selectedValue]);
        if (childrenOptionsValues.length === 0) {
          return false; // No childen options
        } else if (childrenOptionsValues.length === 1) {
          // just one child option, the value is deterrmined by if it is selected
          return childrenOptionsValues[0] === true;
        }

        // Here multiple children are selected or indeterminate
        if (childrenOptionsValues.some(value => value === true)) {
          // if some child value is selected for all nodes, then the parent option is selected
          return true;
        }

        // Here all children options are mixed, we need to check if together
        // the parent option is common for all nodes
        const nodeIds = new Set();
        childrenOptionsValues.forEach(valueNodeIds => {
          valueNodeIds.forEach(nodeId => nodeIds.add(nodeId));
        });
        return nodeIds.size === this.nodeIds.length;
      },
      isCheckboxIndeterminate(optionId) {
        if (this.selectedValues[optionId]) {
          return this.selectedValues[optionId] !== true;
        }
        if (!this.showHierarchy) {
          return false;
        }

        return (
          Object.keys(this.selectedValues).some(selectedValue =>
            this.isSubLevel(selectedValue, optionId)
          ) && !this.isCheckboxSelected(optionId)
        );
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
      setOption(optionId, value) {
        if (value) {
          this.selectedValues = {
            ...this.selectedValues,
            [optionId]: true,
          };
        } else {
          const newSelectedValues = { ...this.selectedValues };

          if (this.showHierarchy) {
            // Remove all children values
            Object.keys(this.selectedValues).forEach(selectedValue => {
              if (this.isSubLevel(selectedValue, optionId)) {
                delete newSelectedValues[selectedValue];
              }
            });
          } else {
            delete newSelectedValues[optionId];
          }

          this.selectedValues = newSelectedValues;
        }
        this.validate();
      },
      autocompleteInputUpdate(selected) {
        const newSelectedValues = {};
        selected.forEach(optionId => {
          newSelectedValues[optionId] = true;
        });
        this.selectedValues = newSelectedValues;
        this.validate();
      },
      treeItemStyle(optionId) {
        if (this.flatList) {
          return {};
        }
        const rule = this.$isRTL ? 'paddingRight' : 'paddingLeft';
        const level = this.getLevel(optionId);
        return { [rule]: `${level * 24}px` };
      },
      tooltipText(optionId) {
        if (optionId === MIXED) {
          return this.$tr('mixedLabel');
        }
        const option = this.options.find(option => option.value === optionId);
        if (!option) {
          return '';
        }
        if (!this.showHierarchy) {
          return option.label || '';
        }
        let currentOption = optionId;
        let text = option.label || '';
        const level = this.getLevel(optionId);
        for (let i = level - 1; i > 0; i--) {
          const parentOption = this.options.find(
            option =>
              this.isSubLevel(currentOption, option.value) && this.getLevel(option.value) === i
          );
          if (parentOption) {
            text = `${parentOption.label} - ${text}`;
            currentOption = parentOption.value;
          }
        }
        return text;
      },
    },
    $trs: {
      saveAction: 'Save',
      cancelAction: 'Cancel',
      resourcesSelected:
        '{count, number, integer} {count, plural, one {resource} other {resources}} selected',
      updateDescendantsCheckbox:
        'Apply to all resources and folders nested within the selected folders',
      mixedLabel: 'Mixed',
      emptyOptionsSearch: 'No options matches the search',
    },
  };

</script>

<style scoped>
</style>