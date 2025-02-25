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
    methods: {
      /*
       * @public
       */
      validate() {
        this.$refs.form.validate();
      },
      /*
       * @public
       */
      reset() {
        this.$refs.form.reset();
        this.$refs.form.resetValidation();
      },
    },
  };

</script>
