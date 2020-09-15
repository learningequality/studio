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
    data: {
      mathquill: null,
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
  };

  Vue.use(vueCustomElement);
  Vue.customElement('markdown-formula', MarkdownFormula, {
    extends: 'span',
    shadow: true,
    shadowCss: css,
  });

  export default MarkdownFormula;

</script>
