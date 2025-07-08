import { ref, onUnmounted, watch } from 'vue';

export function useMathHandling(editor) {
  // State for the modal
  const isMathModalOpen = ref(false);
  const mathModalMode = ref('create'); // 'create' or 'edit'
  const mathModalInitialLatex = ref('');
  const editingMathNodePos = ref(null);
  const popoverStyle = ref({});
  const isModalCentered = ref(false);

  const setPopoverPosition = targetElement => {
    isModalCentered.value = false;
    const rect = targetElement.getBoundingClientRect();
    popoverStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 5}px`,
      left: `${rect.right}px`,
      transform: 'translateX(-100%)',
    };
  };

  const setCenteredPosition = () => {
    isModalCentered.value = true;
    popoverStyle.value = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  };

  const openCreateMathModal = ({ targetElement = null } = {}) => {
    mathModalMode.value = 'create';
    mathModalInitialLatex.value = '';
    editingMathNodePos.value = null;

    if (targetElement) {
      setPopoverPosition(targetElement);
    } else {
      setCenteredPosition();
    }

    isMathModalOpen.value = true;
  };

  const openEditMathModal = ({ pos, latex }) => {
    mathModalMode.value = 'edit';
    mathModalInitialLatex.value = latex;
    editingMathNodePos.value = pos;
    setCenteredPosition(); // Edit mode stays centered
    isMathModalOpen.value = true;
  };

  const closeMathModal = () => {
    isMathModalOpen.value = false;
    isModalCentered.value = false;
  };

  const handleSaveMath = newLatex => {
    if (!editor.value) return;

    if (mathModalMode.value === 'create') {
      editor.value.chain().focus().setMath({ latex: newLatex }).run();
    } else if (editingMathNodePos.value !== null) {
      // For editing - use direct transaction approach
      const { state, view } = editor.value;
      const pos = editingMathNodePos.value;
      const node = state.doc.nodeAt(pos);

      if (node && node.type.name === 'math') {
        const tr = state.tr.setNodeMarkup(pos, null, { latex: newLatex });
        view.dispatch(tr);
        editor.value.commands.focus();
      }
    }
    closeMathModal();
  };

  // Watch for when the editor becomes available and set up event listeners
  watch(
    () => editor.value,
    (newEditor, oldEditor) => {
      if (oldEditor) {
        oldEditor.off('open-math-editor', openEditMathModal);
      }
      if (newEditor) {
        newEditor.on('open-math-editor', openEditMathModal);
      }
    },
    { immediate: true },
  );

  // Close modal when clicking outside
  watch(isMathModalOpen, isOpen => {
    const handler = event => {
      const modalElement = document.querySelector('.formulas-menu');
      if (modalElement && !modalElement.contains(event.target)) {
        closeMathModal();
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

  onUnmounted(() => {
    if (editor.value) {
      editor.value.off('open-math-editor', openEditMathModal);
    }
  });

  return {
    isMathModalOpen,
    mathModalMode,
    mathModalInitialLatex,
    popoverStyle,
    isModalCentered,
    openCreateMathModal,
    closeMathModal,
    handleSaveMath,
  };
}
