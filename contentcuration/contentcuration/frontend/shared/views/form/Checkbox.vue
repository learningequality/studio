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
      event: 'toggle',
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
       * It is changed with the "toggle" event.
       * If used as an array, it stores the values of the checked checkboxes in no particular order.
       * If used as a number, it treats any non-zero value as checked and zero as unchecked.
       */
      state: {
        type: [Boolean, Array, Number],
        default: false,
      },
    },
    computed: {
      isChecked: {
        get() {
          if (Array.isArray(this.state)) {
            return this.state.includes(this.value);
          } else if (typeof this.state === 'number') {
            return this.state !== 0;
          } else {
            return this.state;
          }
        },
        set(checked) {
          if (Array.isArray(this.state)) {
            const index = this.state.indexOf(this.value);
            if (checked && index === -1) {
              this.$emit('toggle', [this.value, ...this.state]);
            } else if (!checked && index !== -1) {
              const newState = [...this.state];
              newState.splice(index, 1);
              this.$emit('toggle', newState);
            }
          } else if (typeof this.state === 'number') {
            this.$emit('toggle', checked ? 1 : 0);
          } else {
            this.$emit('toggle', checked);
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
