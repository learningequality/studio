<template>

  <div class="toolbar-divider"></div>

</template>


<script>

  import { defineComponent } from 'vue';

  export default defineComponent({
    name: 'ToolbarDivider',
  });

</script>


<style scoped>

  .toolbar-divider {
    width: 1.5px;
    height: 20px;
    margin: 0 3px;
    background: #dee2e6;
  }

</style>
