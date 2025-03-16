<template>

  <VTextField
    v-model="email"
    box
    :label="$tr('emailLabel')"
    :required="required"
    :rules="emailRules"
    :validate-on-blur="!validate"
    v-bind="$attrs"
    @keyup.enter="validate = true"
    @keydown="validate = false"
  />

</template>


<script>

  import commonStrings from 'shared/translator';

  export default {
    name: 'EmailField',
    props: {
      value: {
        type: String,
        default: '',
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
      email: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value.trim());
        },
      },
      emailRules() {
        // TODO: fix checking if email exists
        return [
          /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
          v => (!this.required || v.trim() ? true : commonStrings.$tr('fieldRequired')),
          v => /.+@.+\..+/.test(v) || this.$tr('validEmailMessage'),
        ];
      },
    },
    $trs: {
      emailLabel: 'Email',
      validEmailMessage: 'Please enter a valid email',
    },
  };

</script>


<style lang="scss" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
