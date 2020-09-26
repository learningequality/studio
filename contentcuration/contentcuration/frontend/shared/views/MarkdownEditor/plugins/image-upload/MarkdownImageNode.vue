<template>

  <span :class="{editing: editing}">
    <ImageField ref="imageField" :v-model="imageParams" />
  </span>

</template>

<script>

  // import Vue from 'vue';
  import ImageField from '../../MarkdownEditor/ImageField/ImageField';

  import register from '../registerCustomMarkdownNode.js';
  import '../../mathquill/mathquill.js';

  import { imageMdToParams } from './index';
  // vue-custom-element can't use SFC styles, so we load our styles directly,
  // to be passed in when we register this component as a custom element
  import css from '!css-loader!less-loader!./style.less';

  const MarkdownImageNode = {
    name: 'MarkdownImageNode',
    components: {
      ImageField,
    },
    props: {
      editing: {
        type: Boolean,
      },
      markdown: {
        type: String,
        default: '',
      },
    },
    data() {
      return {};
    },
    mounted() {},
    updated() {
      this.$refs.imageField.setImageData(this.imageParams);
    },
    methods: {},
    computed: {
      imageParams() {
        return imageMdToParams(this.markdown);
      },
    },
    shadowCSS: css,
  };

  export const registerMarkdownImageNode = () => register(MarkdownImageNode);
  export default MarkdownImageNode;

</script>
