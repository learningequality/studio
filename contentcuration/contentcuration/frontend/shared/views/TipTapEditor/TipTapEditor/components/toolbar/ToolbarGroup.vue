<template>
  <div class="toolbar-group">
    <slot></slot>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ToolbarGroup'
})
</script>

<style scoped>
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
  position: relative;
}
</style>