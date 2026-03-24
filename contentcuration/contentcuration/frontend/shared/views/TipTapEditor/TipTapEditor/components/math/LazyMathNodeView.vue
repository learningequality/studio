<template>

  <NodeViewWrapper
    as="span"
    class="math-node-wrapper"
  >
    <div
      v-if="!mathComponentLoaded"
      class="math-loading"
      @click="openEditor"
    >
      {{ node.attrs.latex }}
    </div>
    <component
      :is="MathNodeViewComponent"
      v-else
      :node="node"
      :editor="editor"
      :getPos="getPos"
      :updateAttributes="updateAttributes"
      :deleteNode="deleteNode"
    />
  </NodeViewWrapper>

</template>


<script>

  import { defineComponent, ref, onMounted } from 'vue';
  import { NodeViewWrapper } from '@tiptap/vue-2';

  export default defineComponent({
    name: 'LazyMathNodeView',
    components: {
      NodeViewWrapper,
    },
    setup(props) {
      const mathComponentLoaded = ref(false);
      const MathNodeViewComponent = ref(null);

      // Must have all props defined to match the original component
      const openEditor = () => {
        props.editor.emit('open-math-editor', {
          pos: props.getPos(),
          latex: props.node.attrs.latex,
        });
      };

      onMounted(async () => {
        try {
          // Load the actual MathNodeView component
          const { default: MathNodeView } = await import(
            /* webpackChunkName: "mathlive" */ './MathNodeView.vue'
          );
          MathNodeViewComponent.value = MathNodeView;
          mathComponentLoaded.value = true;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to load MathLive:', error);
        }
      });

      return {
        mathComponentLoaded,
        MathNodeViewComponent,
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
      updateAttributes: {
        type: Function,
        default: null,
      },
      deleteNode: {
        type: Function,
        default: null,
      },
    },
  });

</script>


<style scoped>

  .math-node-wrapper {
    display: inline-block;
  }

  .math-loading {
    display: inline-block;
    min-width: 20px;
    min-height: 1em;
    padding: 2px 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    cursor: pointer;
    background-color: #f1f3f5;
    border-radius: 4px;
  }

  .math-loading:hover {
    background-color: #e9ecef;
  }

</style>
