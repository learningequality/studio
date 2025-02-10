<template>

  <div
    ref="image-field"
    v-mouse-up="resizeMouseLeave"
    v-mouse-move="resizeMouseMove"
    :class="[imgClass, draggingResizer ? 'dragging' : '', resizing ? 'resizing' : '']"
  >
    <Menu z-index="203" class="ignore-md">
      <template #activator="{ on }">
        <VBtn
          v-show="!resizing && editing"
          ref="options"
          color="backgroundColor"
          small
          round
          absolute
          style="min-width: 30px;"
          class="edit-options ignore-md ma-1 pa-0"
          v-on="on"
          @click.stop
        >
          <Icon icon="optionsHorizontal" />
        </VBtn>
      </template>
      <VList>
        <VListTile @click="handleEdit">
          <VListTileTitle>{{ $tr('editImageOption') }}</VListTileTitle>
        </VListTile>
        <VListTile @click="handleResize">
          <VListTileTitle>{{ $tr('resizeImageOption') }}</VListTileTitle>
        </VListTile>
        <VListTile @click="handleRemove">
          <VListTileTitle>{{ $tr('removeImageOption') }}</VListTileTitle>
        </VListTile>
      </VList>
    </Menu>
    <img
      ref="image"
      :src="image.src"
      :alt="image.alt"
      :width="image.width"
      :height="image.height"
      @load="setAspectRatio"
    >
    <div
      v-if="resizing"
      class="ignore-md resizer"
      @mousedown.prevent.stop="handleResizeDown"
    ></div>
  </div>

</template>

<script>

  import { CLASS_IMG_FIELD } from '../../constants';
  import register from '../registerCustomMarkdownField.js';
  import { imageMdToParams, paramsToImageMd } from './index';
  import MouseMove from 'shared/directives/mouse-move';
  import MouseUp from 'shared/directives/mouse-up';

  import '../../mathquill/mathquill.js';

  // vue-custom-element can't use SFC styles, so we load our styles directly,
  // to be passed in when we register this component as a custom element
  import css from '!css-loader!sass-loader!./style.scss';

  const MarkdownImageField = {
    name: 'MarkdownImageField',
    directives: {
      MouseUp,
      MouseMove,
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
      return {
        image: {
          width: '',
          height: '',
          src: '',
          alt: '',
        },
        resizing: false,
        draggingResizer: false,
        aspectRatio: 1,
      };
    },
    mounted() {
      this.setImageData(imageMdToParams(this.markdown));
    },
    watch: {
      markdown() {
        this.setImageData(imageMdToParams(this.markdown));
      },
    },
    methods: {
      setImageData(imageData) {
        if (this.image.src !== imageData.src) {
          this.image.width = '';
          this.image.height = '';
        }
        this.image = {
          ...this.image,
          ...imageData,
        };
      },
      setAspectRatio(img) {
        this.aspectRatio = img.target.width / img.target.height;
      },
      exportParamsToMarkdown() {
        this.editorField.innerHTML = paramsToImageMd(this.image);
      },
      handleEdit(event) {
        this.editorField.dispatchEvent(
          new CustomEvent('editImage', {
            detail: {
              editorField: this.editorField,
              component: this,
              image: this.image,
              editEvent: event,
            },
            bubbles: true,
            cancelable: true,
          })
        );
      },
      handleRemove() {
        this.editorField.dispatchEvent(
          new CustomEvent('remove', {
            bubbles: true,
            cancelable: true,
          })
        );
      },
      handleResize() {
        this.resizing = true;
      },
      handleResizeDown() {
        this.draggingResizer = true;
        document.body.style.cursor = 'se-resize';
      },
      resizeMouseLeave() {
        if (this.draggingResizer) {
          this.draggingResizer = false;
          document.body.style.cursor = 'unset';
          this.exitResizing();
        }
      },
      resizeMouseMove(e) {
        if (this.draggingResizer) {
          const boundingRect = this.$refs['image-field'].getBoundingClientRect();
          const x = e.clientX - boundingRect.x;

          // resize the image, maintaining aspect ratio
          this.image.width = Math.max(50, x);
          this.image.height = Math.floor(this.image.width / this.aspectRatio);
        }
      },
      exitResizing() {
        if (this.resizing) {
          this.resizing = false;
          this.draggingResizer = false;
          this.exportParamsToMarkdown();
        }
      },
    },
    $trs: {
      editImageOption: 'Edit',
      resizeImageOption: 'Resize',
      removeImageOption: 'Remove',
    },
    computed: {
      imgClass() {
        return CLASS_IMG_FIELD;
      },
      editorField() {
        return this.$el.getRootNode().host;
      },
    },
    shadowCSS: css,
  };

  export const registerMarkdownImageField = () => register(MarkdownImageField);
  export default MarkdownImageField;

</script>

<style>
/*
  Warning: custom elements don't currently have a way of using SFC styles.
  Instead, add your style changes to `./style.less`

  Additionally, all child component styles must be included in `./style.less`
*/
</style>
