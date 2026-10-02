import { computed, ref, shallowRef, onUnmounted } from 'vue';
import { canInsertNode } from '@tiptap/core';
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
import { InlineDocument } from '../extensions/InlineDocument';
import { createCustomMarkdownSerializer } from '../utils/markdownSerializer';
import { transformPastedHTML } from '../utils/pasteTransform';

// Inline-only fields leave every block node and the line break out of the schema,
// so no command, shortcut or input rule has one to create.
const INLINE_ONLY_STARTER_KIT = {
  document: false,
  paragraph: false,
  heading: false,
  blockquote: false,
  bulletList: false,
  orderedList: false,
  listItem: false,
  listKeymap: false,
  horizontalRule: false,
  hardBreak: false,
  trailingNode: false,
};

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
    { autofocus = false, extensions = [], inlineOnly = false } = {},
  ) => {
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
          ...(inlineOnly && INLINE_ONLY_STARTER_KIT),
        }),
        ...(inlineOnly
          ? [InlineDocument]
          : [
              CodeBlockSyntaxHighlight,
              Small,
              Image,
              TextAlign.configure({
                types: ['heading', 'paragraph', 'image', 'small'],
              }),
            ]),
        StyledStrike,
        StyledUnderline,
        Superscript,
        Subscript,
        Math,
        ...extensions,
      ],
      content: content || '<p></p>',
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
          dir: 'auto',
          ...(inlineOnly && { 'aria-multiline': 'false' }),
        },
        transformPastedHTML: html => transformPastedHTML(html, { inlineOnly }),
        // ProseMirror wraps each line of pasted plain text in a paragraph, which an
        // inline-only schema joins to the next with no space between.
        ...(inlineOnly && {
          transformPastedText: text => {
            if (!/[\r\n]/.test(text)) return text;
            return text
              .split(/[\r\n]+/)
              .map(line => line.trim())
              .filter(Boolean)
              .join(' ');
          },
          // Android Chrome leaves Enter to the browser. Its newline, after Shift or
          // beside a math node, reads back as a space that the keymap never sees.
          handleDOMEvents: {
            beforeinput: (view, event) => {
              if (!['insertParagraph', 'insertLineBreak'].includes(event.inputType)) return false;
              event.preventDefault();
              return true;
            },
          },
        }),
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
