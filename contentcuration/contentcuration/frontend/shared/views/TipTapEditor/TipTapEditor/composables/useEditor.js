import { ref, onMounted, onUnmounted } from 'vue'
import { Editor } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Small } from '../extensions/SmallTextExtension'

export function useEditor() {
  const editor = ref(null)
  const isReady = ref(false)

  const initializeEditor = () => {
    editor.value = new Editor({
      extensions: [
        StarterKit,
        Underline,
        Small,
      ],
      content: '<p></p>',
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
          dir: 'auto'
        },
      },
    })
    
    isReady.value = true
  }

  const destroyEditor = () => {
    if (editor.value) {
      editor.value.destroy()
      editor.value = null
      isReady.value = false
    }
  }

  onMounted(() => {
    initializeEditor()
  })

  onUnmounted(() => {
    destroyEditor()
  })

  return {
    editor,
    isReady,
    initializeEditor,
    destroyEditor
  }
}