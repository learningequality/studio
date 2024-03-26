<template>

  <KCheckbox
    :value="value"
    :label="label"
    :showLabel="showLabel"
    :indeterminate="indeterminate"
    :disabled="disabled"
    :description="description"
    :checked="isChecked"
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
      prop: 'state',
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
       * If the checkbox is used with a v-model of boolean type, then this value would be ignored.
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
       * If used as an array, it stores the values of the checked checkboxes in no particular order.
       * If used as a number, it treats any non-zero value as checked and zero as unchecked.
       * If used as an object, it should have a getter and setter for the checked state.
       * If used as a boolean, it stores the checked state of the checkbox.
       */
      state: {
        type: [Boolean, Array, Number, Object],
        default: false,
        validator: value => {
          if (Array.isArray(value)) {
            return value.every(v => typeof v === 'string' || typeof v === 'number');
          } else if (typeof value === 'number') {
            return true;
          } else if (typeof value === 'object') {
            return typeof value.get === 'function' && typeof value.set === 'function';
          } else {
            return typeof value === 'boolean';
          }
        },
      },
    },
    computed: {
      isChecked: {
        get() {
          if (Array.isArray(this.state)) {
            return this.state.includes(this.value);
          } else if (typeof this.state === 'number') {
            return this.state !== 0;
          } else if (typeof this.state === 'object') {
            return this.state.get();
          } else {
            return this.state;
          }
        },
        set(checked) {
          if (Array.isArray(this.state)) {
            const index = this.state.indexOf(this.value);
            if (checked && index === -1) {
              this.$emit('input', [this.value, ...this.state]);
            } else if (!checked && index !== -1) {
              const newState = [...this.state];
              newState.splice(index, 1);
              this.$emit('input', newState);
            }
          } else if (typeof this.state === 'number') {
            this.$emit('input', checked ? 1 : 0);
          } else if (typeof this.state === 'object') {
            this.state.set(checked);
          }
          else {
            this.$emit('input', checked);
          }
        },
      },
    },
    methods: {
      handleChange(checked) {
        this.isChecked = checked;
      },
    },
  };

</script>


<style lang="less" scoped>

  /deep/ label.theme--light {
    padding: 0 8px;
    color: var(--v-text);
  }

</style>
