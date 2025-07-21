<template>

  <NodeViewWrapper class="image-node-wrapper">
    <div
      class="image-node-view"
      :class="{ 'is-selected': selected }"
      :style="{ width: styleWidth }"
    >
      <img
        ref="imageRef"
        :src="node.attrs.src"
        :alt="node.attrs.alt || 'Image content'"
        class="content"
        @load="onImageLoad"
      >

      <div
        v-if="editor.isEditable"
        class="image-actions"
        :class="{ 'is-compact': isCompact }"
        aria-label="Image actions"
        data-copy-ignore
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
        data-copy-ignore
        @mousedown.prevent="onResizeStart"
        @keydown.prevent="onResizeKeyDown"
      ></div>
    </div>
  </NodeViewWrapper>

</template>


<script>

  import { defineComponent, ref, computed, onUnmounted, onMounted, watch } from 'vue';
  import { NodeViewWrapper } from '@tiptap/vue-2';

  export default defineComponent({
    name: 'ImageNodeView',
    components: {
      NodeViewWrapper,
    },
    setup(props) {
      const width = ref(props.node.attrs.width || null);
      const height = ref(props.node.attrs.height || null);
      const imageRef = ref(null);
      const naturalAspectRatio = ref(null);
      const minWidth = 50;
      const compactThreshold = 200;
      let debounceTimer = null;

      // (to work with undo/redo) Watch for external changes to the node's width and height
      watch(
        () => props.node.attrs.width,
        newWidth => {
          width.value = newWidth;
        },
      );

      watch(
        () => props.node.attrs.height,
        newHeight => {
          height.value = newHeight;
        },
      );

      // Watch for src changes to recalculate aspect ratio
      watch(
        () => props.node.attrs.src,
        () => {
          // Reset aspect ratio when src changes
          naturalAspectRatio.value = null;
          // Force image to reload and recalculate dimensions
          if (imageRef.value) {
            imageRef.value.onload = onImageLoad;
          }
        },
      );

      const onImageLoad = () => {
        if (imageRef.value && imageRef.value.naturalWidth && imageRef.value.naturalHeight) {
          naturalAspectRatio.value = imageRef.value.naturalWidth / imageRef.value.naturalHeight;

          // If no dimensions are set, use natural dimensions
          if (!width.value && !height.value) {
            width.value = imageRef.value.naturalWidth;
            height.value = imageRef.value.naturalHeight;
            saveSize();
          } else if (width.value && !height.value) {
            // If we have width but no height, calculate height
            height.value = calculateProportionalHeight(width.value);
            saveSize();
          } else if (!width.value && height.value) {
            // If we have height but no width, calculate width
            width.value = Math.round(height.value * naturalAspectRatio.value);
            saveSize();
          }
        }
      };

      const isRtl = computed(() => {
        return props.editor.view.dom.closest('[dir="rtl"]') !== null;
      });

      const styleWidth = computed(() => (width.value ? `${width.value}px` : 'auto'));
      const isCompact = computed(() => width.value < compactThreshold);

      const saveSize = () => {
        props.updateAttributes({
          width: width.value,
          height: height.value,
        });
      };

      const calculateProportionalHeight = newWidth => {
        if (naturalAspectRatio.value) {
          return Math.round(newWidth / naturalAspectRatio.value);
        }
        // Fallback: try to get aspect ratio directly from the image element
        if (imageRef.value && imageRef.value.naturalWidth && imageRef.value.naturalHeight) {
          const ratio = imageRef.value.naturalWidth / imageRef.value.naturalHeight;
          return Math.round(newWidth / ratio);
        }
        return null;
      };

      const onResizeStart = startEvent => {
        const startX = startEvent.clientX;
        const startWidth = width.value || startEvent.target.parentElement.offsetWidth;

        const onMouseMove = moveEvent => {
          const deltaX = moveEvent.clientX - startX;

          const newWidth = isRtl.value
            ? startWidth - deltaX // In RTL, moving right should decrease width
            : startWidth + deltaX; // In LTR, moving right should increase width

          const clampedWidth = Math.max(minWidth, newWidth);
          width.value = clampedWidth;
          height.value = calculateProportionalHeight(clampedWidth);
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          saveSize();
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

        const clampedWidth = Math.max(minWidth, newWidth);
        width.value = clampedWidth;
        height.value = calculateProportionalHeight(clampedWidth);

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(saveSize, 500);
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

      onMounted(() => {
        if (imageRef.value && imageRef.value.complete) {
          onImageLoad();
        }
      });

      onUnmounted(() => {
        clearTimeout(debounceTimer);
      });

      return {
        width,
        imageRef,
        styleWidth,
        onResizeStart,
        removeImage,
        editImage,
        isCompact,
        onResizeKeyDown,
        onImageLoad,
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
