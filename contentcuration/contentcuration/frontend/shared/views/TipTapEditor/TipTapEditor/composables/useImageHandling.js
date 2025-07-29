import { ref, onMounted, onUnmounted } from 'vue';
import { useModalPositioning } from './useModalPositioning';

export function useImageHandling(editor) {
  const modalMode = ref(null);
  const modalInitialData = ref({});
  const editingNodePos = ref(null);

  const {
    isModalOpen,
    popoverStyle,
    isModalCentered,
    openModal,
    closeModal: closeModalBase,
    setupClickOutside,
    cleanup,
  } = useModalPositioning();

  const closeModal = () => {
    modalMode.value = null;
    modalInitialData.value = {};
    editingNodePos.value = null;
    closeModalBase();
  };

  setupClickOutside('.image-upload-modal', closeModal);

  const openCreateModal = ({ file = null, targetElement = null } = {}) => {
    modalInitialData.value = { file };
    modalMode.value = 'create';
    openModal({ targetElement });
  };

  const openEditModal = ({ pos, attrs }) => {
    editingNodePos.value = pos;
    modalInitialData.value = { ...attrs };
    modalMode.value = 'edit';
    openModal({ centered: true }); // Edit mode is always centered
  };

  const handleInsert = async data => {
    if (!data.src || !editor?.value) return;
    editor.value.chain().focus().setImage(data).run();
    closeModal();
  };

  const handleUpdate = newAttrs => {
    if (editingNodePos.value !== null && editor?.value) {
      editor.value
        .chain()
        .focus()
        .updateAttributes('image', newAttrs)
        .setNodeSelection(editingNodePos.value)
        .run();
    }
    closeModal();
  };

  const handleRemove = () => {
    if (editingNodePos.value !== null && editor?.value) {
      const node = editor.value.state.doc.nodeAt(editingNodePos.value);
      if (node) {
        editor.value
          .chain()
          .focus()
          .deleteRange({ from: editingNodePos.value, to: editingNodePos.value + node.nodeSize })
          .run();
      }
    }
    closeModal();
  };

  onMounted(() => {
    if (editor?.value) {
      editor.value.on('open-image-editor', openEditModal);
    }
  });

  onUnmounted(() => {
    if (editor?.value) {
      editor.value.off('open-image-editor', openEditModal);
    }
    cleanup();
  });

  return {
    modalMode,
    modalInitialData,
    popoverStyle,
    isModalCentered,
    isModalOpen,
    openCreateModal,
    closeModal,
    handleInsert,
    handleUpdate,
    handleRemove,
  };
}
