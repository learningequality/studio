<template>

  <VTextField
    v-model="field"
    box
    :required="required"
    :rules="rules"
    :label="label || $tr('passwordLabel')"
    :validate-on-blur="!validate"
    type="password"
    @keyup.enter="validate = true"
    @keydown="validate = false"
  />

</template>


<script>

  export default {
    name: 'PasswordField',
    props: {
      value: {
        type: String,
        required: false,
        default: '',
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
        default: null,
      },
      required: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        validate: false,
      };
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
        return [v => (!this.required || v ? true : this.$tr('fieldRequiredMessage'))].concat(
          this.additionalRules
        );
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
