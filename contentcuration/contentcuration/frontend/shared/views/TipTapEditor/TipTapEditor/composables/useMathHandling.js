import { ref, onUnmounted, watch, nextTick } from 'vue';
import { useModalPositioning } from './useModalPositioning';

export function useMathHandling(editor) {
  const mathModalMode = ref('create');
  const mathModalInitialLatex = ref('');
  const editingMathNodePos = ref(null);

  const {
    isModalOpen: isMathModalOpen,
    popoverStyle,
    isModalCentered,
    openModal,
    closeModal: closeModalBase,
    setupClickOutside,
    cleanup,
  } = useModalPositioning();

  const closeMathModal = () => {
    closeModalBase();
  };

  setupClickOutside('.formulas-menu', closeMathModal);

  const openCreateMathModal = ({ targetElement = null } = {}) => {
    mathModalMode.value = 'create';
    mathModalInitialLatex.value = '';
    editingMathNodePos.value = null;
    openModal({ targetElement });
  };

  const openEditMathModal = ({ pos, latex }) => {
    mathModalMode.value = 'edit';
    mathModalInitialLatex.value = latex;
    editingMathNodePos.value = pos;

    // Important to stop the propagation of the click event
    nextTick(() => {
      setTimeout(() => {
        openModal({ centered: true });
      }, 100);
    });
  };

  const handleSaveMath = newLatex => {
    if (!editor.value) return;

    if (mathModalMode.value === 'create') {
      editor.value.chain().focus().setMath({ latex: newLatex }).run();
    } else if (editingMathNodePos.value !== null) {
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

  onUnmounted(() => {
    if (editor.value) {
      editor.value.off('open-math-editor', openEditMathModal);
    }
    cleanup();
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
