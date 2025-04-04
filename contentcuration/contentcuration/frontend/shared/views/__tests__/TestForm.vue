<template>

  <VApp>
    <VForm ref="form">
      <slot name="testComponent"></slot>
    </VForm>
  </VApp>

</template>


<script>

  export default {
    name: 'TestForm',
    /* eslint-disable vue/no-unused-properties */
    methods: {
      /*
       * @public
       */
      validate() {
        return this.$refs.form.validate();
      },
      /*
       * @public
       */
      reset() {
        this.$refs.form.reset();
        this.$refs.form.resetValidation();
      },
    },
    /* eslint-enable vue/no-unused-properties */
  };

</script>
