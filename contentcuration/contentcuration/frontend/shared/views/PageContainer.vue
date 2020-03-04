<template>

  <div class="page-container">
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'PageContainer',
  };

</script>


<style scoped>

  .page-container {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 2px 1px -1px rgba(0, 0, 0, 0.12);
    padding: 32px;
    overflow-x: auto;
    border-radius: 4px;
    background-color: white;
  }

</style>
