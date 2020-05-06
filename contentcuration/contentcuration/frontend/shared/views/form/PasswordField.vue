<template>

  <KTextbox
    v-model="field"
    outline
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
      },
      additionalRules: {
        type: Array,
        default() {
          return [];
        },
      },
      invalid: {
        type: Boolean,
        required: false,
      },
      label: {
        type: String,
        required: false,
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
