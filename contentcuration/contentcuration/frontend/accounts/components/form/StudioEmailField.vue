<template>

  <KTextbox
    :value="value"
    type="email"
    :label="label || $tr('emailLabel')"
    :maxlength="maxlength"
    :showCounter="Boolean(maxlength)"
    :disabled="disabled"
    :invalid="hasError"
    :invalidText="errorText"
    v-bind="$attrs"
    @input="handleInput"
    @blur="$emit('blur')"
  />

</template>


<script>

  export default {
    name: 'StudioEmailField',
    props: {
      value: {
        type: String,
        default: '',
      },
      label: {
        type: String,
        default: null,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      errorMessages: {
        type: Array,
        default: () => [],
      },
      maxlength: {
        type: [String, Number],
        default: null,
      },
    },
    computed: {
      hasError() {
        return this.errorMessages && this.errorMessages.length > 0;
      },
      errorText() {
        return this.hasError ? this.errorMessages[0] : '';
      },
    },
    methods: {
      handleInput(value) {
        // Trim input like original EmailField
        this.$emit('input', value.trim());
      },
    },
    $trs: {
      emailLabel: 'Email address',
    },
  };

</script>


<style scoped>

  /* Minimal styling - KTextbox handles the rest */

</style>
