<template>

  <VTextField
    v-model="field"
    outline
    required
    :rules="rules"
    :label="label || $tr('passwordLabel')"
    validate-on-blur
    type="password"
  />

</template>


<script>

  export default {
    name: 'PasswordField',
    props: {
      value: {
        type: String,
        required: false,
      },
      additionalRules: {
        type: Array,
        default() {
          return [];
        },
      },
      label: {
        type: String,
        required: false,
      },
    },
    computed: {
      field: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      rules() {
        return [v => !!v || this.$tr('fieldRequiredMessage')].concat(this.additionalRules);
      },
    },
    $trs: {
      passwordLabel: 'Password',
      fieldRequiredMessage: 'Field is required',
    },
  };

</script>


<style lang="less" scoped>

</style>
