import { ref, onMounted, onUnmounted } from 'vue';
import { Editor } from '@tiptap/vue-2';
import StarterKitExtension from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { Small } from '../extensions/SmallTextExtension';
import { CodeBlockNoSpellcheck } from '../extensions/CodeBlockNoSpellcheck';
import { Image } from '../extensions/Image';

export function useEditor() {
  const editor = ref(null);
  const isReady = ref(false);

  const initializeEditor = () => {
    editor.value = new Editor({
      extensions: [
        StarterKitExtension.configure({
          codeBlock: false, // Disable default code block to use the extended version
        }),
        CodeBlockNoSpellcheck,
        UnderlineExtension,
        Small,
        Superscript,
        Subscript,
        Image.configure({
          inline: false, // Ensure images are treated as block elements
          allowBase64: true, // Allow base64 images for local uploads
        }),
      ],
      content: '<p></p>',
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
          dir: 'auto',
        },
      },
    });

    isReady.value = true;
  };

  const destroyEditor = () => {
    if (editor.value) {
      editor.value.destroy();
      editor.value = null;
      isReady.value = false;
    }
  };

  onMounted(() => {
    initializeEditor();
  });

  onUnmounted(() => {
    destroyEditor();
  });

  return {
    editor,
    isReady,
    initializeEditor,
    destroyEditor,
  };
}
