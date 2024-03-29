<template>

  <KCheckbox
    :value="value"
    :label="label"
    :showLabel="showLabel"
    :indeterminate="indeterminate"
    :disabled="disabled"
    :description="description"
    :checked="isChecked"
    :style="isErrorState ? 'border-color: var(--v-error);' : ''"
    @change="handleChange"
  >
    <!-- Render the error messages -->
    <template #details>
      <div v-if="!hideDetails && errorMessages.length !== 0" class="error-messages">
        <div v-for="error in errorMessages" :key="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </template>

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
       * Validation rules for the input field.
       * Accepts a mixed array of types function, boolean and string.
       * Functions pass an input value as an argument and must return either true / false
       * or a string containing an error message.
       * The input field will enter an error state if a function
       * returns (or any value in the array contains) false or is a string.
       */
      rules: {
        type: Array,
        default: () => [],
        validator: rules => {
          return rules.every(rule => {
            if (typeof rule === 'function') {
              return typeof rule('') === 'boolean' || typeof rule('') === 'string';
            }
            return typeof rule === 'boolean' || typeof rule === 'string';
          });
        },
      },
      /*
       * Whether to hide the details (validation errors) of the checkbox
       */
      hideDetails: {
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
      /*
       * Returns an array of error messages (string) for the input field.
       */
      errorMessages() {
        return this.rules
          .map(rule => {
            if (typeof rule === 'function') {
              return rule(this.inputValue);
            }
            return rule;
          })
          .filter(rule => typeof rule === 'string');
      },
      /*
       * Returns a boolean indicating whether the input field is in an error state.
       */
      isErrorState() {
        return this.rules.some(rule => {
          if (typeof rule === 'function') {
            return rule(this.inputValue) === false || typeof rule(this.inputValue) === 'string';
          }
          return rule === false || typeof rule === 'string';
        });
      },
    },
    methods: {
      handleChange(checked) {
        this.isChecked = checked;
      },
      updateInputValue(newValue) {
        this.$emit('input', newValue);
      },
    },
  };

</script>


<style lang="less" scoped>

  /deep/ label.theme--light {
    padding: 0 8px;
    color: var(--v-text);
  }

  .error-messages {
    margin-top: 8px;
  }

  .error-message {
    font-size: 12px;
    color: var(--v-error);
  }

</style>
