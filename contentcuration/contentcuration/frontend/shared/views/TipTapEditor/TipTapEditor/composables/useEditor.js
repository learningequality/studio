import { ref, onUnmounted } from 'vue';
import { Editor } from '@tiptap/vue-2';
import StarterKitExtension from '@tiptap/starter-kit';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Small } from '../extensions/SmallTextExtension';
import { StyledStrike, StyledUnderline } from '../extensions/TextDecoration';
import { Image } from '../extensions/Image';
import { CodeBlockSyntaxHighlight } from '../extensions/CodeBlockSyntaxHighlight';
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
          // A link has nothing to navigate to on a device with no internet access, so
          // the editor offers none and the legacy conversion unwraps the ones it finds
          // (utils/assessment/qti/convert.py). Dropping the mark rather than only the
          // toolbar button is what keeps a pasted anchor from arriving as one.
          link: false,
          // Replaced by the versions in extensions/TextDecoration.js, which write the
          // decoration as a style on a <span> — the QTI 3.0 HTML profile has no <u> or <s>.
          strike: false,
          underline: false,
        }),
        CodeBlockSyntaxHighlight,
        Small,
        StyledStrike,
        StyledUnderline,
        Superscript,
        Subscript,
        Image,
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
