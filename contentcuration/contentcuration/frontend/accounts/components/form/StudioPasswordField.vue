<template>

  <KTextbox
    :value="value"
    type="password"
    :label="label || $tr('passwordLabel')"
    :invalid="hasError"
    :invalidText="errorText"
    :showInvalidText="hasError"
    @input="$emit('input', $event)"
    @blur="$emit('blur')"
  />

</template>


<script>

  export default {
    name: 'StudioPasswordField',
    props: {
      value: {
        type: String,
        default: '',
      },
      label: {
        type: String,
        default: null,
      },
      errorMessages: {
        type: Array,
        default: () => [],
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
    $trs: {
      passwordLabel: 'Password',
    },
  };

</script>
