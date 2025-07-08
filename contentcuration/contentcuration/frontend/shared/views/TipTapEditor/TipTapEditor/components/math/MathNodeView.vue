<template>

  <NodeViewWrapper class="math-node-wrapper">
    <math-field
      :key="node.attrs.latex"
      read-only
      :value="node.attrs.latex"
      @click="openEditor"
    />
  </NodeViewWrapper>

</template>


<script>

  import { NodeViewWrapper } from '@tiptap/vue-2';

  export default {
    components: {
      NodeViewWrapper,
    },
    setup(props) {
      const openEditor = () => {
        props.editor.emit('open-math-editor', {
          pos: props.getPos(),
          latex: props.node.attrs.latex,
        });
      };

      return {
        openEditor,
      };
    },
    props: {
      node: {
        type: Object,
        required: true,
      },
      editor: {
        type: Object,
        required: true,
      },
      getPos: {
        type: Function,
        required: true,
      },
    },
  };

</script>


<style scoped>

  .math-node-wrapper {
    display: inline-block;
    padding: 2px 4px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .math-node-wrapper:hover {
    border: 1px solid #cccccc;
  }

</style>


<style>

  /* https://mathlive.io/mathfield/guides/customizing/#styling */

  math-field {
    font-size: 1.4rem;
    font-display: swap;
    border: 0;
  }

  math-field::part(virtual-keyboard-toggle),
  math-field::part(virtual-keyboard-toggle-layer) {
    display: none !important;
  }

</style>
