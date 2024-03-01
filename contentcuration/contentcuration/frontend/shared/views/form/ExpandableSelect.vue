<template>

  <DropdownWrapper
    v-if="!expanded"
    component="VFlex"
    v-bind="$attrs"
  >
    <template #default="{ attach, menuProps }">
      <VSelect
        v-model="valueModel"
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
          :checked="isCheckboxSelected(option.value)"
          :indeterminate="isCheckboxIndeterminate(option.value)"
          data-test="option-checkbox"
          @change="value => setOption(option.value, value)"
        />
      </template>
    </div>

  </div>

</template>

<script>

  import DropdownWrapper from './DropdownWrapper';
  import { getInvalidText } from 'shared/utils/validation';

  export default {
    name: 'ExpandableSelect',
    components: { DropdownWrapper },
    props: {
      value: {
        type: String,
        required: false,
        default: '',
      },
      options: {
        type: Array,
        required: true,
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
      isCheckboxSelected(value) {
        return this.valueModel[value] === true;
      },
      isCheckboxIndeterminate(value) {
        return this.valueModel[value] && this.valueModel[value] !== true;
      },
      setOption(optionId, value) {
        if (value) {
          this.valueModel = { ...this.valueModel, [optionId]: true };
        } else {
          const newValueModel = { ...this.valueModel };
          delete newValueModel[optionId];
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