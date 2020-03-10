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
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 2px 1px -1px rgba(0, 0, 0, 0.12);
  }

</style>
