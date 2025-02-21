<template>

  <VTextarea
    v-model="field"
    box
    :required="required"
    :rules="required ? rules : []"
    :label="label"
    auto-grow
    :validate-on-blur="!validate"
    v-bind="$attrs"
    @keyup.enter="validate = true"
    @keydown="validate = false"
  />

</template>


<script>

  export default {
    name: 'TextArea',
    props: {
      value: {
        type: String,
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
        required: true,
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
        return [v => (!this.required || v.trim() ? true : this.$tr('fieldRequiredMessage'))].concat(
          this.additionalRules
        );
      },
    },
    $trs: {
      fieldRequiredMessage: 'Field is required',
    },
  };

</script>


<style lang="scss" scoped>

</style>
