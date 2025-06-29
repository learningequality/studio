<template>

  <NodeViewWrapper class="image-node-wrapper">
    <div
      class="image-node-view"
      :class="{ 'is-selected': selected }"
      :style="{ width: styleWidth }"
    >
      <img
        :src="node.attrs.src"
        :alt="node.attrs.alt || 'Image content'"
        class="content"
      >

      <div
        v-if="editor.isEditable"
        class="image-actions"
        :class="{ 'is-compact': isCompact }"
        aria-label="Image actions"
      >
        <button
          title="Edit Image"
          aria-label="Edit image"
          tabindex="0"
          @click="editImage"
        >
          <img
            src="../../../assets/icon-edit.svg"
            alt="Edit"
          >
        </button>
        <button
          title="Remove Image"
          aria-label="Remove image"
          tabindex="0"
          @click="removeImage"
        >
          <img
            src="../../../assets/icon-trash.svg"
            alt="Remove"
          >
        </button>
      </div>

      <div
        v-if="editor.isEditable"
        class="resize-handle"
        tabindex="0"
        role="slider"
        aria-label="Resize image"
        aria-valuemin="50"
        :aria-valuenow="width"
        @mousedown.prevent="onResizeStart"
        @keydown.prevent="onResizeKeyDown"
      ></div>
    </div>
  </NodeViewWrapper>

</template>


<script>

  import { defineComponent, ref, computed, onUnmounted, watch } from 'vue';
  import { NodeViewWrapper } from '@tiptap/vue-2';

  export default defineComponent({
    name: 'ImageNodeView',
    components: {
      NodeViewWrapper,
    },
    setup(props) {
      const width = ref(props.node.attrs.width);
      const minWidth = 50;
      const compactThreshold = 200;
      let debounceTimer = null;

      // Watch for external changes to the node's width (to work with undo/redo)
      watch(
        () => props.node.attrs.width,
        newWidth => {
          width.value = newWidth;
        },
      );

      const styleWidth = computed(() => {
        return width.value ? `${width.value}px` : 'auto';
      });
      const isCompact = computed(() => {
        return width.value < compactThreshold;
      });

      const saveWidth = () => {
        props.updateAttributes({
          width: width.value,
          height: null,
        });
      };

      const onResizeStart = startEvent => {
        const startX = startEvent.clientX;
        const startWidth = width.value || startEvent.target.parentElement.offsetWidth;

        const onMouseMove = moveEvent => {
          const newWidth = startWidth + (moveEvent.clientX - startX);
          width.value = Math.max(minWidth, newWidth);
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          saveWidth();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      const onResizeKeyDown = event => {
        const step = 10; // Define the resize step
        const currentWidth = width.value || event.target.parentElement.offsetWidth;
        let newWidth = currentWidth;

        if (event.key === 'ArrowRight') {
          newWidth = currentWidth + step;
        } else if (event.key === 'ArrowLeft') {
          newWidth = currentWidth - step;
        } else if (event.key === 'Escape' || event.key === 'Enter') {
          event.target.blur();
          const endPosition = props.getPos() + props.node.nodeSize;

          // Insert a new paragraph at the end and move to it
          props.editor.chain().focus().insertContentAt(endPosition, { type: 'paragraph' }).run();
          return;
        } else {
          return;
        }

        width.value = Math.max(minWidth, newWidth);

        // Debounce the saveWidth call to avoid excessive updates that can clutter the undo stack
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          saveWidth();
        }, 500);
      };

      const removeImage = () => {
        const position = props.getPos();
        const nodeSize = props.node.nodeSize;

        // Now we can calculate the full range of the node.
        const from = position;
        const to = position + nodeSize;

        props.editor.chain().focus().deleteRange({ from, to }).run();
      };

      const editImage = () => {
        props.editor.emit('open-image-editor', {
          pos: props.getPos(),
          attrs: { ...props.node.attrs },
        });
      };

      onUnmounted(() => {
        clearTimeout(debounceTimer);
      });

      return {
        width,
        styleWidth,
        onResizeStart,
        removeImage,
        editImage,
        isCompact,
        onResizeKeyDown,
      };
    },
    props: {
      node: { type: Object, required: true },
      updateAttributes: { type: Function, required: true },
      editor: { type: Object, required: true },
      selected: { type: Boolean, default: false },
      getPos: { type: Function, required: true },
    },
  });

</script>


<style scoped>

  .image-node-view {
    position: relative;
    display: inline-block;
    max-width: 100%;
    margin: 1rem 0;
    clear: both;
    line-height: 0;
  }

  .image-node-view.is-selected,
  .image-node-view:focus-within {
    outline: 3px solid #666666;
  }

  .content {
    width: 100%;
    height: auto;
  }

  .resize-handle {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: 24px;
    height: 24px;
    cursor: nwse-resize;
    background: white;
    border: 2px solid #666666;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .image-node-view:hover .resize-handle,
  .image-node-view.is-selected .resize-handle,
  .resize-handle:focus {
    opacity: 1;
  }

  .image-actions {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 10;
    display: flex;
    gap: 10px;
    padding: 9px;
    pointer-events: none;
    background-color: white;
    border-radius: 3px;
    opacity: 0;
    transition:
      opacity 0.2s,
      transform 0.2s ease-in-out;
    transform-origin: top right;
  }

  .image-actions.is-compact {
    transform: scale(0.75);
  }

  .image-node-view:hover .image-actions,
  .image-node-view.is-selected .image-actions,
  .image-node-view:focus-within .image-actions {
    pointer-events: auto;
    opacity: 1;
  }

</style>
