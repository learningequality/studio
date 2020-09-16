<template>

  <span :class="{editing: editing}">
    <span ref="mathField">
      <slot></slot>
    </span>
  </span>

</template>

<script>

  import Vue from 'vue';
  import vueCustomElement from 'vue-custom-element';
  import '../../mathquill/mathquill.js';
  import css from '!css-loader!less-loader!./style.less';

  const MarkdownFormula = {
    name: 'MarkdownFormula',
    props: {
      editing: {
        type: Boolean,
      },
    },
    data() {
      return {
        mathquill: null,
      };
    },
    mounted() {
      this.$root.$el.setAttribute('contenteditable', false);
      this.mathquill = MathQuill.getInterface(2).StaticMath(this.$refs.mathField);
      Vue.nextTick(() => this.mathquill.reflow());
    },
    computed: {
      latex() {
        return this.mathquill.latex();
      },
    },
    customElementOptions: {
      shadowCss: css,
      shadow: true,
      extends: 'span',
    },
  };

  export const registerMarkdownFormulaElement = () => {
    Vue.use(vueCustomElement);
    Vue.customElement('markdown-formula', MarkdownFormula, MarkdownFormula.customElementOptions);
  };

  export default MarkdownFormula;

</script>
