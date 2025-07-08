import { ref, watch, onUnmounted } from 'vue';

export function useLinkHandling(editor) {
  const isEditorOpen = ref(false);
  const isBubbleMenuOpen = ref(false);
  const popoverStyle = ref({});
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

    closeBubbleMenu(); // Ensure bubble menu is closed

    const { state } = editor.value;
    const { from, to, empty } = state.selection;

    popoverStyle.value = calculatePosition();
    editorMode.value = mode;

    if (mode === 'edit') {
      const linkAttrs = editor.value.getAttributes('link');
      if (!linkAttrs.href) {
        closeLinkEditor();
        return;
      }
      editor.value.chain().focus().extendMarkRange('link').run();
      const newSelection = editor.value.state.selection;
      savedSelection.value = { from: newSelection.from, to: newSelection.to };
      editorInitialState.value = {
        href: linkAttrs.href,
        text: state.doc.textBetween(newSelection.from, newSelection.to, ' '),
      };
    } else {
      savedSelection.value = { from, to };
      editorInitialState.value = {
        href: '',
        text: empty ? '' : state.doc.textBetween(from, to, ' '),
      };
    }

    isEditorOpen.value = true;
  };

  const closeLinkEditor = () => {
    isEditorOpen.value = false;
    savedSelection.value = null;
    editorMode.value = 'create';
  };

  const openBubbleMenu = () => {
    if (isEditorOpen.value) return;
    popoverStyle.value = calculatePosition();
    isBubbleMenuOpen.value = true;
  };

  const closeBubbleMenu = () => {
    isBubbleMenuOpen.value = false;
  };

  const closeAll = () => {
    closeLinkEditor();
    closeBubbleMenu();
  };

  const saveLink = ({ text, href }) => {
    if (!editor.value || !savedSelection.value) {
      return closeAll();
    }

    const { from, to } = savedSelection.value;
    const tr = editor.value.state.tr;
    const linkMark = editor.value.state.schema.marks.link.create({ href });
    tr.replaceWith(from, to, editor.value.state.schema.text(text, [linkMark]));
    editor.value.view.dispatch(tr);

    closeAll();
  };

  const removeLink = () => {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
    closeAll();
  };

  const handleSelectionUpdate = () => {
    if (editor.value.isActive('link')) {
      openBubbleMenu();
    } else {
      closeBubbleMenu();
    }
  };

  watch([isEditorOpen, isBubbleMenuOpen], ([editorIsOpen, bubbleIsOpen]) => {
    const isOpen = editorIsOpen || bubbleIsOpen;
    const clickHandler = event => {
      const popover =
        document.querySelector('.link-editor-popover') ||
        document.querySelector('.link-bubble-menu');
      if (popover && !popover.contains(event.target)) {
        closeAll();
      }
    };
    const scrollHandler = () => closeAll();

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', clickHandler, true);
        document.addEventListener('scroll', scrollHandler, true);
      }, 0);
    } else {
      document.removeEventListener('mousedown', clickHandler, true);
      document.removeEventListener('scroll', scrollHandler, true);
    }
  });

  watch(
    () => editor.value,
    (newEditor, oldEditor) => {
      if (oldEditor) {
        oldEditor.off('open-link-editor', openLinkEditor);
        oldEditor.off('selectionUpdate', handleSelectionUpdate);
      }
      if (newEditor) {
        newEditor.on('open-link-editor', openLinkEditor);
        newEditor.on('selectionUpdate', handleSelectionUpdate);
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (editor?.value) {
      editor.value.off('open-link-editor', openLinkEditor);
      editor.value.off('selectionUpdate', handleSelectionUpdate);
    }
  });

  return {
    isEditorOpen,
    isBubbleMenuOpen,
    popoverStyle,
    editorInitialState,
    editorMode,
    openLinkEditor,
    closeLinkEditor,
    closeBubbleMenu,
    saveLink,
    removeLink,
  };
}