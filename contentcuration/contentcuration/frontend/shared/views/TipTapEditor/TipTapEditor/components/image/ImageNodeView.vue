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

      // (to work with undo/redo) Watch for external changes to the node's width
      watch(
        () => props.node.attrs.width,
        newWidth => {
          width.value = newWidth;
        },
      );

      const isRtl = computed(() => {
        return props.editor.view.dom.closest('[dir="rtl"]') !== null;
      });

      const styleWidth = computed(() => (width.value ? `${width.value}px` : 'auto'));
      const isCompact = computed(() => width.value < compactThreshold);

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
          const deltaX = moveEvent.clientX - startX;

          const newWidth = isRtl.value
            ? startWidth - deltaX // In RTL, moving right should decrease width
            : startWidth + deltaX; // In LTR, moving right should increase width

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
        const step = 10;
        const currentWidth = width.value || event.target.parentElement.offsetWidth;
        let newWidth = currentWidth;

        // Invert keyboard controls for RTL
        const rightKey = isRtl.value ? 'ArrowLeft' : 'ArrowRight';
        const leftKey = isRtl.value ? 'ArrowRight' : 'ArrowLeft';

        if (event.key === rightKey) {
          newWidth = currentWidth + step;
        } else if (event.key === leftKey) {
          newWidth = currentWidth - step;
        } else if (event.key === 'Escape' || event.key === 'Enter') {
          event.target.blur();
          const endPosition = props.getPos() + props.node.nodeSize;
          props.editor.chain().focus().insertContentAt(endPosition, { type: 'paragraph' }).run();
          return;
        } else {
          return;
        }

        width.value = Math.max(minWidth, newWidth);

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(saveWidth, 500);
      };

      const removeImage = () => {
        const position = props.getPos();
        const nodeSize = props.node.nodeSize;
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
    inset-inline-end: -6px;
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

  [dir='rtl'] .resize-handle {
    cursor: nesw-resize;
  }

  .image-node-view:hover .resize-handle,
  .image-node-view.is-selected .resize-handle,
  .resize-handle:focus {
    opacity: 1;
  }

  .image-actions {
    position: absolute;
    inset-inline-end: 6px;
    top: 6px;
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

  [dir='rtl'] .image-actions {
    transform-origin: top left;
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

  button:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

</style>
