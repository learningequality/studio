<template>

  <VTextField
    v-model="email"
    outline
    :label="$tr('emailLabel')"
    required
    :rules="emailRules"
    validate-on-blur
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
      checkExists: {
        type: Boolean,
        default: false,
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
          () => !this.checkExists || this.$tr('emailExistsMessage'),
        ];
      },
    },
    $trs: {
      emailLabel: 'Email',
      validEmailMessage: 'Please enter a valid email',
      emailRequiredMessage: 'Field is required',
      emailExistsMessage: 'An account with the email already exists',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
