<!-- What this file?
This is a special "Node View" component. Instead of Tiptap rendering a plain <img> tag,
it will render this entire Vue component. This gives us full control to add custom
UI and logic, like the resize handle and remove button. -->

<template>

  <NodeViewWrapper class="image-node-wrapper">
    <div
      class="image-node-view"
      :class="{ 'is-selected': selected }"
      :style="{ width: styleWidth }"
    >
      <img
        :src="node.attrs.src"
        :alt="node.attrs.alt"
        class="content"
      >

      <div
        v-if="editor.isEditable"
        class="resize-handle"
        @mousedown.prevent="onResizeStart"
      ></div>

      <div
        v-if="editor.isEditable"
        class="image-actions"
        :class="{ 'is-compact': isCompact }"
      >
        <button
          title="Edit Image"
          @click="editImage"
        >
          <img
            src="../../../assets/icon-edit.svg"
            alt="Edit"
          >
        </button>
        <button
          title="Remove Image"
          @click="removeImage"
        >
          <img
            src="../../../assets/icon-trash.svg"
            alt="Remove"
          >
        </button>
      </div>
    </div>
  </NodeViewWrapper>

</template>


<script>

  import { defineComponent, ref, computed } from 'vue';
  import { NodeViewWrapper } from '@tiptap/vue-2';

  export default defineComponent({
    name: 'ImageNodeView',
    components: {
      NodeViewWrapper,
    },
    setup(props) {
      const width = ref(props.node.attrs.width);

      const styleWidth = computed(() => {
        return width.value ? `${width.value}px` : 'auto';
      });
      const isCompact = computed(() => {
        return width.value < 200;
      });

      const onResizeStart = startEvent => {
        const startX = startEvent.clientX;
        const startWidth = width.value || startEvent.target.parentElement.offsetWidth;

        const onMouseMove = moveEvent => {
          const newWidth = startWidth + (moveEvent.clientX - startX);
          width.value = Math.max(50, newWidth); // Set a minimum width of 50px
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          // Persist the final width to the Tiptap node's attributes
          props.updateAttributes({
            width: width.value,
            height: null, // Let height be auto to maintain aspect ratio
          });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
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
        // Placeholder for image editing logic
        props.editor.emit('open-image-editor', {
          pos: props.getPos(),
          attrs: { ...props.node.attrs },
        });
      };

      return {
        styleWidth,
        onResizeStart,
        removeImage,
        editImage,
        isCompact,
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

  .image-node-view.is-selected {
    outline: 3px solid #68cef8;
  }

  .content {
    width: 100%;
    height: auto;
  }

  .resize-handle {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
    background: #68cef8;
    border: 2px solid white;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .image-node-view:hover .resize-handle,
  .image-node-view.is-selected .resize-handle {
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
  .image-node-view.is-selected .image-actions {
    opacity: 1;
  }

</style>
