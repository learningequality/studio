<template>

  <DropdownWrapper
    v-if="!expanded"
    component="VFlex"
    v-bind="$attrs"
  >
    <template #default="{ attach, menuProps }">
      <VSelect
        v-model="selectInputValueModel"
        box
        :disabled="disabled"
        :placeholder="placeholder"
        :items="options"
        :label="label"
        :required="required"
        :rules="rules"
        :menu-props="menuProps"
        :attach="attach"
        :chips="multiple"
        :multiple="multiple"
        :clearable="multiple"
        :deletableChips="multiple"
        :hint="hint"
        :persistent-hint="!!hint"
        @focus="$emit('focus')"
      />
    </template>
  </DropdownWrapper>
  <div
    v-else
    :class="disabled ? 'disabled' : ''"
  >
    <h5 v-if="!hideLabel">
      {{ label }}
    </h5>
    <div>
      <template v-if="!multiple">
        <KRadioButton
          v-for="option in options"
          :key="option.value"
          v-model="valueModel"
          :buttonValue="option.value"
          :label="option.text"
        />
      </template>
      <template v-else>
        <KCheckbox
          v-for="option in options"
          :key="option.value"
          :label="option.text"
          :checked="isSelected(option.value)"
          data-test="option-checkbox"
          @change="value => setOption(option.value, value)"
        />
      </template>
    </div>
    <p
      v-if="hint"
      :style="{ color: $themeTokens.annotation }"
    >
      {{ hint }}
    </p>

  </div>

</template>

<script>

  import DropdownWrapper from './DropdownWrapper';
  import { getInvalidText } from 'shared/utils/validation';

  export default {
    name: 'ExpandableSelect',
    components: { DropdownWrapper },
    props: {
      /**
       * It can receive a value as a string for single select or an object with
       * the following structure for multiple select:
       * {
       *   [optionId]: [itemId1, itemId2, ...]
       * }
       * where itemId is the id of the item that has the option selected
       */
      value: {
        type: [String, Object],
        required: true,
      },
      options: {
        type: Array,
        required: true,
      },
      /**
       * If the select is multiple, this prop is required, and it
       * represents the available items that can have the options selected
       */
      availableItems: {
        type: Array,
        required: false,
        default: () => [],
      },
      placeholder: {
        type: String,
        required: false,
        default: '',
      },
      label: {
        type: String,
        required: false,
        default: '',
      },
      hideLabel: {
        type: Boolean,
        required: false,
        default: false,
      },
      rules: {
        type: Array,
        required: false,
        default: () => [],
      },
      required: {
        type: Boolean,
        default: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      expanded: {
        type: Boolean,
        default: false,
      },
      multiple: {
        type: Boolean,
        default: false,
      },
      hint: {
        type: String,
        default: '',
      },
    },
    computed: {
      valueModel: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      selectInputValueModel: {
        get() {
          if (this.multiple) {
            return Object.keys(this.valueModel).filter(
              key => this.valueModel[key].length === this.availableItems.length
            );
          }
          return this.valueModel;
        },
        set(value) {
          if (this.multiple) {
            const newValueModel = {};
            value.forEach(optionId => {
              newValueModel[optionId] = this.availableItems;
            });
            this.valueModel = newValueModel;
          } else {
            this.valueModel = value;
          }
        },
      },
    },
    methods: {
      /**
       * @public
       */
      validate() {
        if (this.rules && this.rules.length) {
          return getInvalidText(this.rules, this.valueModel);
        }
      },
      isSelected(value) {
        if (!this.valueModel[value]) {
          return false;
        }
        return this.valueModel[value].length === this.availableItems.length;
      },
      setOption(optionId, value) {
        if (value) {
          this.valueModel = {
            ...this.valueModel,
            [optionId]: this.availableItems,
          };
        } else {
          const newValueModel = { ...this.valueModel };
          delete newValueModel[optionId];
          this.valueModel = newValueModel;
        }
      },
    },
  };

</script>

<style scoped>
  .disabled {
    pointer-events: none;
    opacity: 0.5;
  }
</style>
