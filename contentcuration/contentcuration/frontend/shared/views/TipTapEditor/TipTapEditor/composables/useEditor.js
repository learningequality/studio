import { computed, ref, shallowRef, onUnmounted } from 'vue';
import { canInsertNode } from '@tiptap/core';
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

// Whether replacing the selection would delete a line break, welding two lines.
function spansLines({ doc, selection }) {
  if (selection.empty) return false;
  // The ends sit in different blocks, e.g. two paragraphs.
  if (!selection.$from.sameParent(selection.$to)) return true;
  // Both ends can still share a parent while covering several lines: select-all
  // resolves both ends in `doc` itself, around every paragraph; and one paragraph
  // can hold hard breaks. So walk the range, counting the textblocks it touches
  // and looking for a hard break.
  let textblocks = 0;
  let spans = false;
  doc.nodesBetween(selection.from, selection.to, node => {
    if (node.isTextblock) textblocks += 1;
    if (textblocks > 1 || node.type.name === 'hardBreak') spans = true;
    return !spans;
  });
  return spans;
}

export function useEditor() {
  const editor = ref(null);
  const isReady = ref(false);
  const isFocused = ref(false);
  const hasCursor = ref(false);
  const editorState = shallowRef(null);

  const initializeEditor = (
    content,
    mode = 'edit',
    { autofocus = false, extensions = [] } = {},
  ) => {
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
        ...extensions,
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
        hasCursor.value = true;
      },
      onBlur: () => {
        isFocused.value = false;
      },
      onTransaction: ({ editor: instance }) => {
        editorState.value = instance.state;
      },
    });
    // Building the editor dispatches no transaction, so `onTransaction` has not
    // run yet: seed the state here, or `insertContext` stays `null` until the
    // author's first edit or click.
    editorState.value = editor.value.state;
  };

  const destroyEditor = () => {
    if (editor.value) {
      editor.value.destroy();
      editor.value = null;
      isReady.value = false;
      editorState.value = null;
    }
  };

  // Reads `editorState`, not `editor.value.state`: ProseMirror state is not
  // reactive, and reads through `editor` only update because Vue 2 deep-observes
  // the instance held in a `ref`. `onTransaction` replacing `editorState` is the
  // explicit signal.
  // Lazy, like any computed: evaluated only when a contributed action reads it, so
  // an editor without one never walks the selection.
  const insertContext = computed(() => {
    const state = editorState.value;
    if (!state) return null;
    let spans;
    return {
      editor: editor.value,
      selection: {
        empty: state.selection.empty,
        // A getter, so only a predicate that reads it pays for the walk, once.
        get spansLines() {
          if (spans === undefined) spans = spansLines(state);
          return spans;
        },
        hasCursor: hasCursor.value,
      },
      canInsertNode: typeName => {
        const type = state.schema.nodes[typeName];
        return Boolean(type) && canInsertNode(state, type);
      },
    };
  });

  onUnmounted(() => {
    destroyEditor();
  });

  return {
    editor,
    isReady,
    isFocused,
    insertContext,
    initializeEditor,
    destroyEditor,
  };
}
