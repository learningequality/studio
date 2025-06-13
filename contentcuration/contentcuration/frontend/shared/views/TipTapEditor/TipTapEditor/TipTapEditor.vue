<template>
  <div class="editor-container">
    <EditorToolbar />
    <EditorContentWrapper />
  </div>
</template>

<script>
import { defineComponent, provide } from 'vue'
import EditorToolbar from './components/EditorToolbar.vue'
import EditorContentWrapper from './components/EditorContentWrapper.vue'
import { useEditor } from './composables/useEditor'

export default defineComponent({
  name: 'RichTextEditor',
  components: {
    EditorToolbar,
    EditorContentWrapper
  },
  setup() {
    const { editor, isReady } = useEditor()

    // Provide editor instance to all child components
    provide('editor', editor)
    provide('isReady', isReady)

    return {
      editor,
      isReady
    }
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

:deep(ul),
:deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}
:deep(li) {
  margin: 4px 0;
}
</style>