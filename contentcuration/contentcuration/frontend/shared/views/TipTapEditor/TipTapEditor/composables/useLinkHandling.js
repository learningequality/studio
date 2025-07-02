import { ref, watch } from 'vue';

export function useLinkHandling(editor) {
  const isEditorOpen = ref(false);
  const editorStyle = ref({});
  const editorInitialState = ref({ text: '', href: '' });
  const savedSelection = ref(null);

  const calculatePosition = () => {
    if (!editor.value) return {};
    const { view } = editor.value;
    const { from } = view.state.selection;
    const coords = view.coordsAtPos(from);
    return {
      position: 'fixed',
      left: `${coords.left}px`,
      top: `${coords.bottom + 8}px`,
      zIndex: 1001,
    };
  };

  const openLinkEditor = () => {
    if (!editor.value) return;
    
    const { state } = editor.value;
    const { from, to, empty } = state.selection;
    savedSelection.value = { from, to };
    editorStyle.value = calculatePosition();
    editorInitialState.value = {
      href: editor.value.getAttributes('link').href || '',
      text: empty ? '' : state.doc.textBetween(from, to, ' '),
    };
    
    editor.value.commands.focus(); // Force a transaction to close the bubble menu
    isEditorOpen.value = true;
  };

  const closeLinkEditor = () => {
    isEditorOpen.value = false;
    savedSelection.value = null;
  };

  const saveLink = ({ text, href }) => {
    if (!editor.value || !href || !savedSelection.value) {
      return closeLinkEditor();
    }

    const { from, to } = savedSelection.value;

    editor.value
      .chain()
      .focus()
      // 1. First, select the range we originally had.
      .setTextSelection({ from, to })
      // 2. Insert the new text, which will replace the selection.
      .insertContent(text)
      // 3. re-select the text we just inserted.
      // The new 'to' position is the original 'from' + the new text's length.
      .setTextSelection({ from, to: from + text.length })
      .setLink({ href })
      .run();

    closeLinkEditor();
  };

  const removeLink = () => {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
    closeLinkEditor();
  };

  watch(isEditorOpen, isOpen => {
    const handler = event => {
      const popover = document.querySelector('.link-editor-popover');
      if (popover && !popover.contains(event.target)) {
        closeLinkEditor();
      }
    };
    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handler, true);
      }, 0);
    } else {
      document.removeEventListener('mousedown', handler, true);
    }
  });

  return {
    isEditorOpen,
    editorStyle,
    editorInitialState,
    openLinkEditor,
    closeLinkEditor,
    saveLink,
    removeLink,
  };
}
