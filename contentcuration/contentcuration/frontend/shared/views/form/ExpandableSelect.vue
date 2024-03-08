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
        @focus="$emit('focus')"
      />
    </template>
  </DropdownWrapper>
  <div
    v-else
    :class="disabled ? 'disabled' : ''"
  >
    <h5>
      {{ label }}
    </h5>
    <KRadioButton
      v-for="duration in options"
      :key="duration.value"
      v-model="valueModel"
      :buttonValue="duration.value"
      :label="duration.text"
    />
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
    },
  };

</script>

<style scoped>
  .disabled {
    pointer-events: none;
    opacity: 0.5;
  }
</style>