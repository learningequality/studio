<template>

  <VTextarea
    v-model="field"
    outline
    required
    :rules="rules"
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
      fieldRequiredMessage: 'Field is required',
    },
  };

</script>


<style lang="less" scoped>

</style>
