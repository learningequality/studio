<template>
  <div class="toolbar-divider" />
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ToolbarDivider'
})
</script>

<style scoped>
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #dee2e6;
  margin: 0 4px;
}
</style>