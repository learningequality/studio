<template>
  <div class="editor-content">
    <editor-content 
      v-if="isReady && editor" 
      :editor="editor" 
      class="tiptap-editor"
    />
    <div v-else class="editor-placeholder">
      Loading editor...
    </div>
  </div>
</template>

<script>
import { defineComponent, inject } from 'vue'
import { EditorContent } from '@tiptap/vue-2'

export default defineComponent({
  name: 'EditorContentWrapper',
  components: {
    EditorContent 
  },
  setup() {
    const editor = inject('editor')
    const isReady = inject('isReady')

    return {
      editor,
      isReady
    }
  }
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

.tiptap-editor {
  outline: none;
}

/* TipTap Editor Styles */
:deep(.ProseMirror) {
  outline: none;
  min-height: 200px;
  padding: 0;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

:deep(.ProseMirror p) {
  margin: 0 0 8px 0;
}

:deep(.ProseMirror p:last-child) {
  margin-bottom: 0;
}

:deep(.ProseMirror strong) {
  font-weight: 600;
}

:deep(.ProseMirror em) {
  font-style: italic;
}

:deep(.ProseMirror u) {
  text-decoration: underline;
}

:deep(.ProseMirror s) {
  text-decoration: line-through;
}

:deep(.ProseMirror sub) {
  vertical-align: sub;
  font-size: smaller;
}

:deep(.ProseMirror sup) {
  vertical-align: super;
  font-size: smaller;
}

:deep(.ProseMirror ul) {
  list-style-type: disc;
  margin-left: 20px;
  margin-bottom: 8px;
}

:deep(.ProseMirror ol) {
  list-style-type: decimal;
  margin-left: 20px;
  margin-bottom: 8px;
}

:deep(.ProseMirror li) {
  margin-bottom: 4px;
}

:deep(.ProseMirror h1) {
  font-size: 32px;
  font-weight: 600;
  margin: 24px 0 16px;
}

:deep(.ProseMirror h2) {
  font-size: 24px;
  font-weight: 600;
  margin: 8px 0;
}

:deep(.ProseMirror h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 8px 0;
}

:deep(.ProseMirror small) {
  font-size: 12px;
  margin: 4px 0 4px;
}
</style>