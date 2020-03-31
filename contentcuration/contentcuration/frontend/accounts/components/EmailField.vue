<template>

  <VTextField
    v-model="email"
    outline
    :label="$tr('emailLabel')"
    required
    :rules="emailRules"
    validate-on-blur
    v-bind="$attrs"
  />

</template>


<script>

  export default {
    name: 'EmailField',
    props: {
      value: {
        type: String,
        default: '',
      },
    },
    computed: {
      email: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      emailRules() {
        // TODO: fix checking if email exists
        return [
          v => !!v || this.$tr('emailRequiredMessage'),
          v => /.+@.+\..+/.test(v) || this.$tr('validEmailMessage'),
        ];
      },
    },
    $trs: {
      emailLabel: 'Email',
      validEmailMessage: 'Please enter a valid email',
      emailRequiredMessage: 'Field is required',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
