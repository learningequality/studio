import { ref, onUnmounted } from 'vue';
import { Editor } from '@tiptap/vue-2';
import StarterKitExtension from '@tiptap/starter-kit';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Small } from '../extensions/SmallTextExtension';
import { Image } from '../extensions/Image';
import { CodeBlockSyntaxHighlight } from '../extensions/CodeBlockSyntaxHighlight';
import { CustomLink } from '../extensions/Link';
import { Math } from '../extensions/Math';
import { createCustomMarkdownSerializer } from '../utils/markdownSerializer';
import { transformPastedHTML } from '../utils/pasteTransform';

export function useEditor() {
  const editor = ref(null);
  const isReady = ref(false);
  const isFocused = ref(false);

  const initializeEditor = (content, mode = 'edit', { autofocus = false } = {}) => {
    editor.value = new Editor({
      autofocus,
      editable: mode === 'edit',
      extensions: [
        StarterKitExtension.configure({
          codeBlock: false, // Disable default code block to use the extended version
          link: false, // Disable default link to use the custom link extension
          // The QTI 3.0 HTML profile has no <u> or <s>, so the item schema rejects an
          // item carrying either and the save fails. Dropping the marks rather than only
          // their toolbar buttons also takes away the keyboard shortcuts and the paste
          // path, which would otherwise still produce content that cannot be saved.
          strike: false,
          underline: false,
        }),
        CodeBlockSyntaxHighlight,
        Small,
        Superscript,
        Subscript,
        Image,
        CustomLink, // Use our custom Link extension
        Math,
        TextAlign.configure({
          types: ['heading', 'paragraph', 'image', 'small'],
        }),
      ],
      content: content || '<p></p>',
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
          dir: 'auto',
        },
        transformPastedHTML: html => transformPastedHTML(html),
      },
      onCreate: () => {
        isReady.value = true;

        // Create a simple storage object to hold our custom markdown serializer
        if (!editor.value.storage.markdown) {
          editor.value.storage.markdown = {};
        }
        editor.value.storage.markdown.getMarkdown = createCustomMarkdownSerializer(editor.value);
      },

      onFocus: () => {
        isFocused.value = true;
      },
      onBlur: () => {
        isFocused.value = false;
      },
    });
  };

  const destroyEditor = () => {
    if (editor.value) {
      editor.value.destroy();
      editor.value = null;
      isReady.value = false;
    }
  };

  onUnmounted(() => {
    destroyEditor();
  });

  return {
    editor,
    isReady,
    isFocused,
    initializeEditor,
    destroyEditor,
  };
}
