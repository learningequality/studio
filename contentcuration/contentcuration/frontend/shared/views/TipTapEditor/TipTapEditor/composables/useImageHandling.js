import { ref, onMounted, onUnmounted } from 'vue';

export function useImageHandling(editor) {
  const modalMode = ref(null); // 'create' or 'edit'
  const modalInitialData = ref({});
  const editingNodePos = ref(null);

  const openCreateModal = (file = null) => {
    modalInitialData.value = { file };
    modalMode.value = 'create';
  };

  const openEditModal = ({ pos, attrs }) => {
    editingNodePos.value = pos;
    modalInitialData.value = { ...attrs };
    modalMode.value = 'edit';
  };

  const closeModal = () => {
    modalMode.value = null;
    modalInitialData.value = {};
    editingNodePos.value = null;
  };

  const handleInsert = async data => {
    // console.log('Inserting image with data:', data);
    // console.log('Editor state:', editor?.value);
    if (!data.src || !editor?.value) return;

    if (editor?.value) {
      editor.value.chain().focus().setImage(data).run();
    }

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

  // Handle editor events more safely
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
    openCreateModal,
    closeModal,
    handleInsert,
    handleUpdate,
    handleRemove,
  };
}
