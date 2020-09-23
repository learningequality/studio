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

  const MarkdownFormula = {
    name: 'MarkdownFormula',
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

      // This is necessary so that the contents of the slot can't be deleted or selected
      // when the custom element is in an editable field.
      this.$el.parentNode.host.setAttribute('contenteditable', false);
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

  export const registerMarkdownFormulaElement = () => register(MarkdownFormula);
  export default MarkdownFormula;

</script>
