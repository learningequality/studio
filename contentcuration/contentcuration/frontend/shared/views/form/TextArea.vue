<template>

  <VTextarea
    v-model="field"
    outline
    :required="required"
    :rules="required? rules : []"
    :label="label"
    auto-grow
    validate-on-blur
    v-bind="$attrs"
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
        return [v => !this.required || !!v.trim() || this.$tr('fieldRequiredMessage')].concat(
          this.additionalRules
        );
      },
    },
    $trs: {
      fieldRequiredMessage: 'Field is required',
    },
  };

</script>


<style lang="less" scoped>

</style>
