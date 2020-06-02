<template>

  <img
    :height="`${height}px`"
    width="auto"
    :src="require('shared/images/kolibri-logo.svg')"
  >

</template>


<script>

  export default {
    name: 'KolibriLogo',
    props: {
      height: {
        type: Number,
        default: 28,
      },
    },
  };

</script>


<style lang="less" scoped>

  img {
    object-fit: contain;
  }

</style>
