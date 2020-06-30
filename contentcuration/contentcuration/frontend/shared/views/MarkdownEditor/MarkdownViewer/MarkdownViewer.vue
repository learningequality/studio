<template>

  <div>
    <div ref="viewer"></div>
  </div>

</template>

<script>

  import Viewer from 'tui-editor/dist/tui-editor-Viewer';

  import '../mathquill/mathquill.js';

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

  @import '~highlight.js/styles/github.css';
  @import '~tui-editor/dist/tui-editor-contents.css';
  @import '../mathquill/mathquill.css';

  .math-field {
    font-family: Symbola;
  }

</style>
