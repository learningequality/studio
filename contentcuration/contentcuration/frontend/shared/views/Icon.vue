<template>

  <VIcon class="notranslate">
    {{ icon }}
  </VIcon>

</template>


<script>

  export default {
    name: 'Icon',
    props: {
      icon: {
        type: String,
      },
    },
  };

</script>


<style lang="less" scoped>

</style>
