<!--
Why this file exists:
This is a special "Node View" component. Instead of Tiptap rendering a plain <img> tag,
it will render this entire Vue component. This gives us full control to add custom
UI and logic, like the resize handle and remove button.
-->
<template>
  <node-view-wrapper class="image-node-wrapper">
    <div
      class="image-node-view"
      :class="{ 'is-selected': selected }"
      :style="{ width: styleWidth }"
    >
      <img :src="node.attrs.src" :alt="node.attrs.alt" class="content" />

      <div
        v-if="editor.isEditable"
        class="resize-handle"
        @mousedown.prevent="onResizeStart"
      ></div>

      <div v-if="editor.isEditable" class="image-actions" :class="{ 'is-compact': isCompact }">
        <button @click="editImage" title="Edit Image">
          <img src="../../assets/icon-edit.svg" alt="Edit" />
        </button>
        <button @click="removeImage" title="Remove Image">
          <img src="../../assets/icon-trash.svg" alt="Remove" />
        </button>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'; 
import { NodeViewWrapper } from '@tiptap/vue-2';

export default defineComponent({
  name: 'ImageNodeView',
  components: {
    NodeViewWrapper,
  },
  props: {
    node: { type: Object, required: true },
    updateAttributes: { type: Function, required: true },
    editor: { type: Object, required: true },
    selected: { type: Boolean, default: false },
    getPos: { type: Function, required: true },
  },
  setup(props) {
    const width = ref(props.node.attrs.width);

    const styleWidth = computed(() => {
      return width.value ? `${width.value}px` : 'auto';
    }); 
    const isCompact = computed(() => {
      return width.value < 200;
    });

    const onResizeStart = (startEvent) => {
      const startX = startEvent.clientX;
      const startWidth = width.value || startEvent.target.parentElement.offsetWidth;

      const onMouseMove = (moveEvent) => {
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
      // getPos() returns the node's starting position as a number.
      const position = props.getPos();

      // We can get the node's size from the node object itself.
      const nodeSize = props.node.nodeSize;

      // Now we can calculate the full range of the node.
      const from = position;
      const to = position + nodeSize;

      console.log(`Removing image node from ${from} to ${to}`);

      // This command is now valid and will delete the exact range of our node.
      props.editor.chain().focus().deleteRange({ from, to }).run();
    };

    const editImage = () => {
      // Placeholder for image editing logic
      console.log('Edit image functionality not implemented yet.');
    };

    return {
      width,
      styleWidth,
      onResizeStart,
      removeImage,
      editImage,
      isCompact,
    };
  },
});
</script>

<style scoped>
.image-node-view {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  clear: both; 
  margin: 1rem 0;
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
  background: #68cef8;
  border: 2px solid white;
  border-radius: 50%;
  cursor: nwse-resize;
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
  opacity: 0;
  display: flex;
  gap: 10px;
  z-index: 10;
  background-color: white;
  padding: 9px;
  border-radius: 3px;

  transform-origin: top right; 
  transition: opacity 0.2s, transform 0.2s ease-in-out;
}

.image-actions.is-compact {
  transform: scale(0.75);
}

.image-node-view:hover .image-actions,
.image-node-view.is-selected .image-actions {
  opacity: 1;
}

</style>