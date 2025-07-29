import { ref, watch, onUnmounted } from 'vue';
import { useBreakpoint } from './useBreakpoint';

export function useLinkHandling(editor) {
  const isEditorOpen = ref(false);
  const isBubbleMenuOpen = ref(false);
  const popoverStyle = ref({});
  const editorInitialState = ref({ text: '', href: '' });
  const editorMode = ref('create');
  const savedSelection = ref(null);
  const { isMobile } = useBreakpoint();

  const calculatePosition = (forceCenter = false) => {
    if (!editor.value) return {};

    // Only center the edit modal on mobile, not the bubble menu
    if (isMobile.value && forceCenter) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
      };
    }

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

    popoverStyle.value = calculatePosition(true);
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
    popoverStyle.value = calculatePosition(false);
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

  const handleResize = () => {
    if (isEditorOpen.value) {
      popoverStyle.value = calculatePosition(true);
    } else if (isBubbleMenuOpen.value) {
      popoverStyle.value = calculatePosition(false);
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

    const scrollHandler = event => {
      // Don't close on horizontal scroll within input fields
      const target = event.target;
      const isInputField = target.tagName === 'INPUT';
      const isInsideModal = document.querySelector('.link-editor-popover')?.contains(target);

      if (!isInputField || !isInsideModal) {
        closeAll();
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', clickHandler, true);
        document.addEventListener('scroll', scrollHandler, true);
        window.addEventListener('resize', handleResize, true);
      }, 0);
    } else {
      document.removeEventListener('mousedown', clickHandler, true);
      document.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', handleResize, true);
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
