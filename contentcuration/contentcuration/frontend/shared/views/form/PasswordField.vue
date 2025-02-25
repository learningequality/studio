<template>

  <VTextField
    v-model="field"
    box
    :required="required"
    :rules="rules"
    :label="label || $tr('passwordLabel')"
    :validate-on-blur="!validate"
    :error-messages="errorMessages"
    type="password"
    @keyup.enter="validate = true"
    @keydown="validate = false"
  />

</template>


<script>

  import commonStrings from 'shared/translator';

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
      errorMessages: {
        type: Array,
        default() {
          return [];
        },
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
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        return [v => (!this.required || v ? true : commonStrings.$tr('fieldRequired'))].concat(
          this.additionalRules,
        );
      },
    },
    $trs: {
      passwordLabel: 'Password',
    },
  };

</script>


<style lang="scss" scoped></style>
