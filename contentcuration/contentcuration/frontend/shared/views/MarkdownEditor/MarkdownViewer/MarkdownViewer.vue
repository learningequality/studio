<template>

  <div class="markdown-viewer notranslate">
    <div ref="viewer"></div>
  </div>

</template>

<script>

  /**
   * * * * * * * * * * * * * * * * * * *
   * See docs/markdown_editor_viewer.md
   * * * * * * * * * * * * * * * * * * *
   */

  import '@toast-ui/editor/dist/toastui-editor-viewer.css';
  import Viewer from '@toast-ui/editor/dist/toastui-editor-viewer';

  import '../mathquill/mathquill.js';
  import { CLASS_MATH_FIELD } from '../constants';
  import formulaMdToHtml from '../plugins/formulas/formula-md-to-html.js';
  import imagesMdToHtml from '../plugins/image-upload/image-md-to-html.js';

  export default {
    name: 'MarkdownViewer',
    props: {
      markdown: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        viewer: null,
        mathQuill: null,
      };
    },
    watch: {
      markdown(newMd, previousMd) {
        if (newMd !== previousMd) {
          this.viewer.setMarkdown(newMd);
          this.initStaticMathFields();
        }
      },
    },
    mounted() {
      this.mathQuill = MathQuill.getInterface(2);

      this.viewer = new Viewer({
        el: this.$refs.viewer,
        height: 'auto',
        initialValue: this.markdown,
        customHTMLRenderer: {
          text(node) {
            let content = imagesMdToHtml(node.literal);
            content = formulaMdToHtml(content);
            return {
              type: 'html',
              content,
            };
          },
        },
      });

      this.initStaticMathFields();
    },
    methods: {
      initStaticMathFields() {
        const mathFieldEls = this.$el.getElementsByClassName(CLASS_MATH_FIELD);
        for (const mathFieldEl of mathFieldEls) {
          this.mathQuill.StaticMath(mathFieldEl);
        }
      },
    },
  };

</script>

<style lang="scss" scoped>

  .markdown-viewer {
    max-width: calc(100% - 2em);
  }

</style>
