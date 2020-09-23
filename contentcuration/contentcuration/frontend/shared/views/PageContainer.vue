<template>

  <div class="page-container">
    <slot></slot>
  </div>

</template>


<script>

  export default {
    // TODO: replace with design system component
    name: 'PageContainer',
  };

</script>


<style lang="less" scoped>

  .page-container {
    padding: 32px;
    overflow-x: auto;
    background-color: white;
    border-radius: 4px;
  }

</style>
