<template>

  <div class="editor-content">
    <EditorContent
      v-if="isReady && editor"
      :editor="editor"
      class="tiptap-editor"
    />
  </div>

</template>


<script>

  import { defineComponent, inject } from 'vue';
  import { EditorContent } from '@tiptap/vue-2';

  export default defineComponent({
    name: 'EditorContentWrapper',
    components: {
      EditorContent,
    },
    setup() {
      const editor = inject('editor');
      const isReady = inject('isReady');

      return {
        editor,
        isReady,
      };
    },
  });

</script>


<!-- Scoped styles for the wrapper component itself -->
<style scoped>

  /* A formula or a long URL is one unbreakable inline node, so it can be wider than
     the editor and paint over whatever bounds it. Toolbars and popovers are siblings
     of this element, so clipping here leaves them whole. */
  .editor-content {
    padding: 16px;
    padding-inline: 24px;
    margin-inline: 0 auto;
    overflow: hidden;
  }

  .tiptap-editor {
    outline: none;
  }

</style>


<style>

  .ProseMirror {
    padding: 0;
    padding-inline: 0;
    margin-inline: 0;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: #333333;
    outline: none;
  }

  .ProseMirror p {
    margin: 0 0 8px;
    margin-block: 8px 8px;
  }

  .ProseMirror p:last-child {
    margin-block-end: 0;
  }

  .prose {
    text-align: start;
  }

  .prose[dir='rtl'] {
    text-align: start;
  }

</style>
