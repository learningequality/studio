<template>

  <KCheckbox
    ref="checkbox"
    :value="value"
    :label="label"
    :showLabel="showLabel"
    :indeterminate="indeterminate"
    :disabled="disabled"
    :description="description"
    :checked="isChecked"
    :labelDir="labelDir"
    @change="handleChange"
  >
    <slot></slot>
  </KCheckbox>

</template>


<script>

  import KCheckbox from 'kolibri-design-system/lib/KCheckbox';

  export default {
    name: 'Checkbox',
    components: {
      KCheckbox,
    },
    model: {
      prop: 'inputValue',
      event: 'input',
    },
    props: {
      /*
       * The label to show next to the checkbox
       */
      label: {
        type: String,
        default: null,
      },
      /*
       * Whether to show the label next to the checkbox
       */
      showLabel: {
        type: Boolean,
        default: true,
      },
      /*
       * The value of the checkbox.
       * If the checkbox is used with a v-model of array type,
       * then this value would be added/removed from the array based on the checkbox state.
       * If the checkbox is used with a v-model of any other type, then the v-model would
       * be set to this value when the checkbox is checked and set to null when unchecked.
       */
      value: {
        type: [String, Number],
        default: null,
      },
      /*
       * Whether the checkbox is disabled
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /*
       * The description to show below the checkbox
       */
      description: {
        type: String,
        default: null,
      },
      /*
       * Whether the checkbox is in indeterminate state
       */
      indeterminate: {
        type: Boolean,
        default: false,
      },
      /*
       * The reactive state of the checkbox which is used with v-model.
       * It is changed with the "input" event.
       * If used as an array, "value" prop is added/removed from it based on the checkbox state.
       * If used as a boolean, it is set to true when checked and false when unchecked.
       * If used as any other type, it is set to "value" prop when checked and null when unchecked.
       */
      inputValue: {
        type: [Array, Boolean, Number, String, Object],
        default: false,
      },
      /**
       * RTL dir of the text label
       * Options: 'auto', 'ltr', 'rtl', null.
       */
      labelDir: {
        type: String,
        default: 'auto',
      },
    },
    computed: {
      isChecked: {
        get() {
          if (Array.isArray(this.inputValue)) {
            return this.inputValue.includes(this.value);
          }

          if (typeof this.inputValue === 'boolean') {
            return this.inputValue;
          }

          return Boolean(this.inputValue);
        },
        set(checked) {
          if (Array.isArray(this.inputValue)) {
            const index = this.inputValue.indexOf(this.value);
            if (checked && index === -1) {
              this.updateInputValue([this.value, ...this.inputValue]);
            } else if (!checked && index !== -1) {
              const newInputValue = [...this.inputValue];
              newInputValue.splice(index, 1);
              this.updateInputValue(newInputValue);
            }
            return;
          }

          if (typeof this.inputValue === 'boolean') {
            this.updateInputValue(checked);
            return;
          }

          if (checked) {
            this.updateInputValue(this.value);
          } else {
            this.updateInputValue(null);
          }
        },
      },
    },
    methods: {
      handleChange(checked, e) {
        e.stopPropagation();
        this.isChecked = checked;
      },
      updateInputValue(newValue) {
        this.$emit('input', newValue);
      },
      /**
       * @public
       */
      focus() {
        this.$refs.checkbox.focus();
      },
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep label.theme--light {
    padding: 0 8px;
    color: var(--v-text);
  }

</style>
