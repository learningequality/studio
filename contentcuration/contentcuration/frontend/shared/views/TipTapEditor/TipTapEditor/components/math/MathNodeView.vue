<template>

  <NodeViewWrapper class="math-node-wrapper">
    <div
      v-if="!mathLiveLoaded"
      class="math-loading"
    >
      {{ node.attrs.latex }}
    </div>
    <math-field
      v-else
      :key="node.attrs.latex"
      read-only
      :value="node.attrs.latex"
      @click="openEditor"
    />
  </NodeViewWrapper>

</template>


<script>

  import { NodeViewWrapper } from '@tiptap/vue-2';
  import { ref, onMounted } from 'vue';

  export default {
    components: {
      NodeViewWrapper,
    },
    setup(props) {
      const mathLiveLoaded = ref(false);

      const loadMathLive = async () => {
        try {
          // Dynamic import of mathlive
          await import(/* webpackChunkName: "mathlive" */ 'mathlive');
          mathLiveLoaded.value = true;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to load MathLive:', error);
        }
      };

      const openEditor = () => {
        props.editor.emit('open-math-editor', {
          pos: props.getPos(),
          latex: props.node.attrs.latex,
        });
      };

      onMounted(() => {
        loadMathLive();
      });

      return {
        mathLiveLoaded,
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

  .math-loading {
    padding: 2px 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    background-color: #f5f5f5;
    border-radius: 2px;
  }

</style>


<style>

  /* These styles will only be applied after mathlive is loaded */

  /* https://mathlive.io/mathfield/guides/customizing/#styling */

  math-field {
    font-size: 1.3rem;
    font-display: swap;
    background-color: transparent;
    border: 0;
  }

  math-field::part(virtual-keyboard-toggle),
  math-field::part(virtual-keyboard-toggle-layer) {
    display: none !important;
  }

  math-field::part(menu-toggle) {
    display: none;
  }

</style>
