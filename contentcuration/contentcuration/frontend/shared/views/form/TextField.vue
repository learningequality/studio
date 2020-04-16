<template>

  <VTextField
    v-model="field"
    outline
    :required="required"
    :rules="rules"
    :label="label"
    validate-on-blur
    v-bind="$attrs"
  />

</template>


<script>

  export default {
    name: 'TextField',
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
        required: true,
      },
      required: {
        type: Boolean,
        default: true,
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
        return [v => !!v.trim() || this.$tr('fieldRequiredMessage')].concat(this.additionalRules);
      },
    },
    $trs: {
      fieldRequiredMessage: 'Field is required',
    },
  };

</script>


<style lang="less" scoped>

</style>
