import { ref, onUnmounted } from 'vue';
import { Editor } from '@tiptap/vue-2';
import StarterKitExtension from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { Small } from '../extensions/SmallTextExtension';
import { Image } from '../extensions/Image';
import { CodeBlockSyntaxHighlight } from '../extensions/CodeBlockSyntaxHighlight';
import { CustomLink } from '../extensions/Link';

export function useEditor() {
  const editor = ref(null);
  const isReady = ref(false);

  // Accept the bubble menu element as an argument
  const initializeEditor = (bubbleMenuElement, isLinkEditorOpen) => {
    editor.value = new Editor({
      extensions: [
        StarterKitExtension.configure({
          codeBlock: false, // Disable default code block to use the extended version
          link: false, // Disable default link to use the custom link extension
        }),
        UnderlineExtension,
        CodeBlockSyntaxHighlight,
        Small,
        Superscript,
        Subscript,
        Image,
        CustomLink, // Use our custom Link extension
        BubbleMenu.configure({
          // Use the passed-in element directly
          element: bubbleMenuElement,
          tippyOptions: {
            placement: 'bottom-start',
            inertia: true,
          },
          shouldShow: ({ editor }) => {
            return !isLinkEditorOpen.value && editor.isActive('link');
          },
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
