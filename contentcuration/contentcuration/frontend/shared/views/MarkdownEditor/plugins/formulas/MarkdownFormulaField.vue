<template>

  <span :class="{ editing: editing }">
    <span ref="formula"></span>
  </span>

</template>

<script>

  import register from '../registerCustomMarkdownField.js';
  import '../../mathquill/mathquill.js';

  // vue-custom-element can't use SFC styles, so we load our styles directly,
  // to be passed in when we register this component as a custom element
  import css from '!css-loader!sass-loader!./style.scss';

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
        mathquill: MathQuill.getInterface(2),
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
        this.mathquill.StaticMath(this.$refs.formula);
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
  Instead, add your style changes to `./style.scss`

  Additionally, all child component styles must be included in `./style.scss`
*/
</style>
