<template>
  <div class="editor-content">
    <div class="editor-placeholder">
      I will render TipTap's editor here...
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'EditorContent'
})
</script>

<style scoped>
.editor-content {
  min-height: 200px;
  padding: 16px;
}

.editor-placeholder {
  color: #6c757d;
  font-size: 14px;
}
</style>