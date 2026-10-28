<template>

  <div>
    <KMultiSelect
      :expanded="expanded"
      :value="autocompleteValues"
      :options="categoriesList"
      itemValue="value"
      itemText="text"
      :label="translateMetadataString('category')"
      :autoPromoteParent="false"
      :listMaxHeight="expanded ? '250px' : undefined"
      clearable
      :noResultsText="$tr('noCategoryFoundText')"
      :messages="messages"
      @input="onKMultiSelectInput"
    >
      <template #chip="{ option, remove: removeChip }">
        <span :ref="'category-chip-' + option.value">
          <KChip
            :text="option.text"
            :removeLabel="$tr('removeCategory', { label: tooltipText(option.value) })"
            close
            @close="removeChip"
            @mousedown.native.prevent
          />
        </span>
        <KTooltip
          :reference="'category-chip-' + option.value"
          :refs="$refs"
          placement="top"
          :text="tooltipText(option.value)"
        />
      </template>
    </KMultiSelect>
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import KMultiSelect from 'kolibri-design-system/lib/candidate/multiselect/KMultiSelect';
  import KChip from 'kolibri-design-system/lib/candidate/multiselect/KChip';
  import { getSortedCategories } from 'shared/utils/helpers';
  import { createMultiSelectMessages } from 'shared/utils/multiSelectMessages';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'CategoryOptions',
    components: { KMultiSelect, KChip },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      /**
       * This prop receives an object with the following structure:
       * {
       *  [categoryId]: [nodeId1, nodeId2, ...]
       * }
       * Where nodeId is the id of the node that has the category selected
       */
      value: {
        type: Object,
        required: true,
      },
      /**
       * An array of nodeIds that we are editing. If none, we will asume that we
       * are editing just one node
       */
      nodeIds: {
        type: Array,
        default: () => [],
      },
      expanded: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      categoriesList() {
        const categories = getSortedCategories();
        return Object.entries(categories).map(([id, category]) => ({
          value: id,
          text: this.translateMetadataString(camelCase(category)),
          level: this.findDepth(id),
        }));
      },
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      autocompleteValues() {
        const selectedValues = Object.entries(this.selected)
          .filter(entry => entry[1].length === this.nodeIds.length)
          .map(([key]) => key);
        return selectedValues;
      },
      messages() {
        const { clearAllAction$ } = communityChannelsStrings;
        return createMultiSelectMessages({
          clearText: clearAllAction$,
          itemsSelected: ({ count }) => this.$tr('itemsSelected', { count }),
          cleared: () => {
            this.selected = {};
            return this.$tr('allCategoriesCleared');
          },
          partiallySelected: true,
        });
      },
    },
    methods: {
      onKMultiSelectInput(newValues) {
        const newValueIds = new Set(newValues);
        const removedIds = Object.keys(this.selected).filter(
          key => this.selected[key].length === this.nodeIds.length && !newValueIds.has(key),
        );
        const partial = Object.fromEntries(
          Object.entries(this.selected).filter(
            ([key, selectedNodeIds]) =>
              selectedNodeIds.length !== this.nodeIds.length &&
              !removedIds.some(removedId => key.startsWith(removedId)),
          ),
        );
        this.selected = {
          ...partial,
          ...Object.fromEntries(newValues.map(value => [value, this.nodeIds])),
        };
      },
      tooltipText(optionId) {
        const option = this.categoriesList.find(option => option.value === optionId);
        if (!option) {
          return '';
        }
        let currentOption = optionId;
        let text = option.text || '';
        const level = option.level;
        for (let i = level - 1; i >= 0; i--) {
          const parentOption = this.categoriesList.find(
            option => currentOption.startsWith(option.value) && option.level === i,
          );
          if (parentOption) {
            text = `${parentOption.text} - ${text}`;
            currentOption = parentOption.value;
          }
        }
        return text;
      },
      findDepth(val) {
        return val.split('.').length - 1;
      },
    },
    $trs: {
      noCategoryFoundText: 'Category not found',
      itemsSelected: '{count, plural, one {# category selected} other {# categories selected}}',
      allCategoriesCleared: 'All categories cleared',
      removeCategory: 'Remove {label}',
    },
  };

</script>
