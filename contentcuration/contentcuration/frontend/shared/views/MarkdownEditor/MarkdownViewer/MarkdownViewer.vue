<template>

  <div>
    <div ref="viewer"></div>
  </div>

</template>

<script>

  import 'highlight.js/styles/github.css';
  import 'tui-editor/dist/tui-editor-contents.css';
  import Viewer from 'tui-editor/dist/tui-editor-Viewer';

  import 'utils/mathquill.js';
  import 'static/css/mathquill.css';

  import { CLASS_MATH_FIELD } from '../constants';
  import formulas from '../extensions/formulas';

  export default {
    name: 'MarkdownViewer',
    props: {
      markdown: {
        type: String,
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
        exts: [formulas],
      });

      this.initStaticMathFields();
    },
    methods: {
      initStaticMathFields() {
        const mathFieldEls = this.$el.getElementsByClassName(CLASS_MATH_FIELD);
        for (let mathFieldEl of mathFieldEls) {
          this.mathQuill.StaticMath(mathFieldEl);
        }
      },
    },
  };

</script>

<style lang="less" scoped>

  .math-field {
    font-family: Symbola;
  }

</style>
