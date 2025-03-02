<template>

  <!-- Conditionally add the class based on the applyOffset prop -->
  <div
    :class="['checkbox-container', applyOffset ? 'inner-context' : 'outer-context']"
    :data-test="`checkbox-${value}`"
  >
    <KCheckbox
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
  </div>

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
      /**
       * The label to show next to the checkbox.
       */
      label: {
        type: String,
        default: null,
      },
      /**
       * Whether to show the label next to the checkbox.
       */
      showLabel: {
        type: Boolean,
        default: true,
      },
      /**
       * The value of the checkbox.
       * For v-model of array type, this value is added/removed from the array.
       * For other types, v-model is set to this value when checked, and null when unchecked.
       */
      value: {
        type: [String, Number],
        default: null,
      },
      /**
       * Whether the checkbox is disabled.
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * The description to show below the checkbox.
       */
      description: {
        type: String,
        default: null,
      },
      /**
       * Whether the checkbox is in an indeterminate state.
       */
      indeterminate: {
        type: Boolean,
        default: false,
      },
      /**
       * The reactive state of the checkbox (used with v-model).
       */
      inputValue: {
        type: [Array, Boolean, Number, String, Object],
        default: false,
      },
      /**
       * RTL direction of the text label.
       * Options: 'auto', 'ltr', 'rtl', or null.
       */
      labelDir: {
        type: String,
        default: 'auto',
      },
      /**
       * When true, applies a downward offset to the checkbox icon (for inner checkboxes).
       * Outer checkboxes (default) remain centered.
       */
      applyOffset: {
        type: Boolean,
        default: false,
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
          this.updateInputValue(checked ? this.value : null);
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
    },
  };

</script>

<!-- Remove "scoped" so that our override rules apply globally to KCheckbox internals -->
<style lang="less">

  /* Base container styling */
  .checkbox-container {
    display: flex;
    align-items: center;
  }

  /* Base styling for labels (from Kolibri's design system) */
  :deep(label.theme--light) {
    display: flex;
    align-items: center;
    padding: 0 8px;
    color: var(--v-text);
  }

  /* Base icon styling: no offset by default */
  :deep(.checkbox-icon) {
    position: relative !important;
    top: 0 !important;
    flex-shrink: 0;
    width: 28px !important;
    height: 28px !important;
  }

  /* For inner checkboxes, apply a downward shift */
  .inner-context :deep(.checkbox-icon) {
    top: 1.8px !important;
  }

  /* For outer checkboxes (optional, explicitly set to 0) */
  .outer-context :deep(.checkbox-icon) {
    top: 0 !important;
  }

  /* Ensure consistent label alignment */
  :deep(.checkbox-label) {
    display: flex;
    align-items: center;
  }

  /* Spacing for raw checkbox input */
  :deep(input[type='checkbox']) {
    margin-right: 8px;
  }

</style>