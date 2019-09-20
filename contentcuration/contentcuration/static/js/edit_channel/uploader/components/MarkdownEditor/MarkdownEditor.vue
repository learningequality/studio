<template>

  <div>
    <Editor />
  </div>

</template>

<script>

  import 'tui-editor/dist/tui-editor.css';
  import 'tui-editor/dist/tui-editor-contents.css';
  import 'codemirror/lib/codemirror.css';

  import { Editor } from '@toast-ui/vue-editor';

  export default {
    name: 'MarkdownEditor',
    components: {
      Editor,
    },
  };

</script>
