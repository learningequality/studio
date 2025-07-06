import { ref, watch, onMounted, onUnmounted } from 'vue';

export function useLinkHandling(editor) {
  const isEditorOpen = ref(false);
  const editorStyle = ref({});
  const editorInitialState = ref({ text: '', href: '' });
  const editorMode = ref('create');
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

  const openLinkEditor = (mode = 'create') => {
    if (!editor.value) return;
    
    const { state } = editor.value;
    const { from, to, empty } = state.selection;

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
    editorMode.value = 'create'; // Reset to default
  };

  const saveLink = ({ text, href }) => {
    if (!editor.value || !savedSelection.value) {
      return closeLinkEditor();
    }

    const { from, to } = savedSelection.value;

    const tr = editor.value.state.tr;
    const linkMark = editor.value.state.schema.marks.link.create({ href });

    tr.replaceWith(from, to, editor.value.state.schema.text(text, [linkMark]));
    editor.value.view.dispatch(tr);

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

  const handleOpenLinkEditorEvent = () => {
    openLinkEditor();
  };

  onMounted(() => {
    if (editor?.value) {
      editor.value.on('open-link-editor', handleOpenLinkEditorEvent);
    }
  });

  onUnmounted(() => {
    if (editor?.value) {
      editor.value.off('open-link-editor', handleOpenLinkEditorEvent);
    }
  });

  return {
    isEditorOpen,
    editorStyle,
    editorInitialState,
    editorMode,
    openLinkEditor,
    closeLinkEditor,
    saveLink,
    removeLink,
  };
}