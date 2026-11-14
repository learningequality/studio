<template>

  <KMultiSelect
    :value="autocompleteValues"
    :options="categoriesList"
    itemValue="value"
    itemText="text"
    :label="translateMetadataString('category')"
    :autoPromoteParent="false"
    clearable
    :expanded="expanded"
    :listMaxHeight="expanded ? '250px' : undefined"
    :noResultsText="$tr('noCategoryFoundText')"
    :messages="messages"
    @input="onKMultiSelectInput"
    @click.native.capture="onRootClickCapture"
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
      /**
       * When true the category list is always visible below the search field
       * instead of opening as a dropdown.
       */
      expanded: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        pendingClearAll: false,
      };
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
      /**
       * Categories applied to every edited node. Categories that only some of the
       * edited nodes have stay in `value` but are not shown as selected.
       */
      autocompleteValues() {
        return Object.entries(this.selected)
          .filter(entry => entry[1].length === this.nodeIds.length)
          .map(([key]) => key);
      },
      messages() {
        const { clearAllAction$ } = communityChannelsStrings;
        return createMultiSelectMessages({
          clearText: clearAllAction$,
          itemsSelected: ({ count }) => this.$tr('itemsSelected', { count }),
          cleared: () => this.$tr('allCategoriesCleared'),
          partiallySelected: true,
        });
      },
    },
    methods: {
      /**
       * KMultiSelect emits an empty value for clear-all, for removing the last
       * chip, for Backspace in an empty search field and for unchecking the last
       * option, without saying which. Only clear-all should drop categories that
       * are applied to some of the edited nodes, so the clear button's click is
       * noted in the capture phase (it stops propagation itself) and read when
       * the matching input event arrives.
       */
      onRootClickCapture(event) {
        const button = event.target && event.target.closest ? event.target.closest('button') : null;
        const { clearAllAction$ } = communityChannelsStrings;
        this.pendingClearAll = Boolean(button && button.getAttribute('aria-label') === clearAllAction$());
      },
      /**
       * Applies the difference between the current and the new selection, so
       * categories that only some of the edited nodes have survive unrelated
       * changes.
       */
      onKMultiSelectInput(newValues) {
        const clearAll = this.pendingClearAll;
        this.pendingClearAll = false;
        const previous = this.autocompleteValues;
        if (!newValues.length && clearAll) {
          this.selected = {};
          return;
        }
        const next = new Set(newValues);
        const newSelected = { ...this.selected };
        previous
          .filter(value => !next.has(value))
          .forEach(removed => {
            Object.keys(newSelected)
              .filter(selectedValue => selectedValue.startsWith(removed))
              .forEach(selectedValue => {
                delete newSelected[selectedValue];
              });
          });
        newValues
          .filter(value => !previous.includes(value))
          .forEach(added => {
            newSelected[added] = this.nodeIds;
          });
        this.selected = newSelected;
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
