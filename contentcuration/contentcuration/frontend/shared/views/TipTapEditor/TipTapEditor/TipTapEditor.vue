<template>
  <div class="editor-container">
    <EditorToolbar />
    <EditorContent />
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import EditorToolbar from './components/EditorToolbar.vue'
import EditorContent from './components/EditorContent.vue'

export default defineComponent({
  name: 'RichTextEditor',
  components: {
    EditorToolbar,
    EditorContent
  }
})
</script>

<style scoped>

.editor-container {
  width: 1000px;
  margin: auto;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}

/* Typography Styles */
:deep(h1) {
  font-size: 32px;
  font-weight: 600;
  margin: 24px 0 16px;
}

:deep(h2) {
  font-size: 24px;
  font-weight: 600;
  margin: 8px 0;
}

:deep(h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 8px 0;
}

:deep(p) {
  font-size: 16px;
  margin: 8px 0;
}

:deep(small) {
  font-size: 12px;
  margin: 4px 0;
}
</style>