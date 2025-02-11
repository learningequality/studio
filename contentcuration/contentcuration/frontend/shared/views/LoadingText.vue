<template>

  <VLayout
    align-center
    justify-center
    fill-height
    class="loading-text pa-4"
    :style="{ position: absolute ? 'absolute' : 'unset' }"
  >
    <VFlex xs12>
      <VProgressCircular
        :size="70"
        :width="7"
        color="loading"
        indeterminate
      />
    </VFlex>
  </VLayout>

</template>


<script>

  export default {
    name: 'LoadingText',
    props: {
      absolute: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .loading-text {
    top: 0;
    left: 0;
    width: 100%;
    text-align: center;
  }

</style>
