<template>

  <div>
    <Editor
      ref="editor"
      :mode="mode"
      :height="height"
      :options="options"
      :value="value"
      @change="onChange"
    />
  </div>

</template>

<script>

  import 'tui-editor/dist/tui-editor.css';
  import 'tui-editor/dist/tui-editor-contents.css';
  import 'codemirror/lib/codemirror.css';

  import { Editor } from '@toast-ui/vue-editor';

  const MODE = 'wysiwyg';
  const HEIGHT = '100px';
  const OPTIONS = {
    usageStatistics: false,
    hideModeSwitch: true,
    toolbarItems: ['bold', 'italic'],
  };

  export default {
    name: 'MarkdownEditor',
    components: {
      Editor,
    },
    model: {
      prop: 'value',
      event: 'update',
    },
    props: {
      value: {
        type: String,
      },
    },
    data() {
      return {
        mode: MODE,
        height: HEIGHT,
        options: OPTIONS,
      };
    },
    methods: {
      onChange() {
        const markdown = this.$refs.editor.invoke('getMarkdown');

        this.$emit('update', markdown);
      },
    },
  };

</script>
