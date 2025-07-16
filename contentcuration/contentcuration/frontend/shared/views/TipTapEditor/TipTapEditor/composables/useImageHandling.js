import { ref, onMounted, onUnmounted, watch } from 'vue';

export function useImageHandling(editor) {
  const modalMode = ref(null); // 'create' or 'edit'
  const modalInitialData = ref({});
  const popoverStyle = ref({});
  const editingNodePos = ref(null);
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

  const openCreateModal = ({ file = null, targetElement = null } = {}) => {
    if (targetElement) {
      setPopoverPosition(targetElement);
    } else {
      setCenteredPosition();
    }
    modalInitialData.value = { file };
    modalMode.value = 'create';
  };

  const openEditModal = ({ pos, attrs }) => {
    setCenteredPosition();
    editingNodePos.value = pos;
    modalInitialData.value = { ...attrs };
    modalMode.value = 'edit';
  };

  const closeModal = () => {
    modalMode.value = null;
    modalInitialData.value = {};
    editingNodePos.value = null;
    isModalCentered.value = false;
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

  watch(modalMode, mode => {
    const handler = event => {
      const popover = document.querySelector('.image-upload-modal');
      if (popover && !popover.contains(event.target)) {
        closeModal();
      }
    };
    if (mode) {
      setTimeout(() => {
        document.addEventListener('mousedown', handler, true);
      }, 0);
    } else {
      document.removeEventListener('mousedown', handler, true);
    }
  });

  onMounted(() => {
    if (editor?.value) {
      editor.value.on('open-image-editor', openEditModal);
    }
  });

  onUnmounted(() => {
    if (editor?.value) {
      editor.value.off('open-image-editor', openEditModal);
    }
  });

  return {
    modalMode,
    modalInitialData,
    popoverStyle,
    isModalCentered,
    openCreateModal,
    closeModal,
    handleInsert,
    handleUpdate,
    handleRemove,
  };
}
