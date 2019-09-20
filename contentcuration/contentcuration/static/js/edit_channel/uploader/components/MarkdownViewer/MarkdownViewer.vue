<template>

  <div>
    <Viewer
      :value="value"
      :height="height"
    />
  </div>

</template>

<script>

  import 'tui-editor/dist/tui-editor-contents.css';
  import 'highlight.js/styles/github.css';

  import { Viewer } from '@toast-ui/vue-editor';

  const HEIGHT = '100px';

  export default {
    name: 'MarkdownViewer',
    components: {
      Viewer,
    },
    props: {
      value: {
        type: String,
      },
    },
    data() {
      return {
        height: HEIGHT,
      };
    },
  };

</script>
