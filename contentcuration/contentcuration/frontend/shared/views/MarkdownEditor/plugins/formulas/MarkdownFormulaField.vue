<template>

  <span :class="{editing: editing}">
    <span ref="formula"></span>
  </span>

</template>

<script>

  import Vue from 'vue';

  import register from '../registerCustomMarkdownNode.js';
  import '../../mathquill/mathquill.js';

  // vue-custom-element can't use SFC styles, so we load our styles directly,
  // to be passed in when we register this component as a custom element
  import css from '!css-loader!less-loader!./style.less';

  const MarkdownFormulaField = {
    name: 'MarkdownFormulaField',
    props: {
      editing: {
        type: Boolean,
      },
      markdown: {
        type: String,
      },
    },
    data() {
      return {
        mathquill: null,
      };
    },
    mounted() {
      this.renderMath();
    },
    updated() {
      this.renderMath();
    },
    methods: {
      renderMath() {
        this.$refs.formula.innerHTML = this.markdown;
        this.mathquill = MathQuill.getInterface(2).StaticMath(this.$refs.formula);
        Vue.nextTick(() => this.mathquill.reflow());
      },
    },
    computed: {
      latex() {
        return this.markdown;
      },
    },
    shadowCSS: css,
  };

  export const registerMarkdownFormulaField = () => register(MarkdownFormulaField);
  export default MarkdownFormulaField;

</script>

<style>
/*
   Warning: custom elements don't currently have a way of using SFC styles.
  Instead, add your style changes to `./style.less`

  Additionally, all child component styles must be included in `./style.less`
*/
</style>
