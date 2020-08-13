<template>

  <div
    ref="image-field"
    v-mouse-up="resizeMouseLeave"
    v-mouse-move="resizeMouseMove"
    v-click-outside="exitResizing"
    :class="[imgClass, draggingResizer? 'dragging' : '', resizing? 'resizing': '']"
    @mousemove="resizeMouseMove"
    @mouseup="resizeMouseLeave"
  >
    <VMenu offset-y class="ignore-md">
      <template #activator="{ on }">
        <VBtn
          v-show="!resizing"
          ref="options"
          color="backgroundColor"
          small
          round
          absolute
          style="min-width: 30px;"
          class="pa-0 ma-1 edit-options ignore-md"
          v-on="on"
          @click.stop
        >
          <Icon small>
            more_horiz
          </Icon>
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
    </VMenu>
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
      class="resizer ignore-md"
      @mousedown.prevent.stop="handleResizeDown"
    ></div>
  </div>

</template>
<script>

  import { CLASS_IMG_FIELD } from '../../constants';
  import MouseUp from 'shared/directives/mouse-up';
  import MouseMove from 'shared/directives/mouse-move';
  import ClickOutside from 'shared/directives/click-outside';

  export default {
    name: 'ImageField',
    directives: {
      MouseUp,
      MouseMove,
      ClickOutside,
    },
    props: {
      src: {
        type: String,
        required: true,
      },
      alt: {
        type: String,
        default: '',
      },
      width: {
        type: String,
        default: '',
      },
      height: {
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
    computed: {
      imgClass() {
        return CLASS_IMG_FIELD;
      },
    },
    mounted() {
      this.setImageData({
        width: this.width,
        height: this.height,
        src: this.src,
        alt: this.alt,
      });
    },
    methods: {
      // @public - used to update image
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
      handleEdit(event) {
        this.$emit('edit', { event, component: this, image: this.image });
      },
      handleRemove() {
        this.$destroy();
        this.$el.parentNode.removeChild(this.$el);
      },
      handleResize() {
        this.resizing = true;
      },
      handleResizeDown() {
        this.draggingResizer = true;
        document.body.style.cursor = 'se-resize';
      },
      resizeMouseLeave() {
        this.draggingResizer = false;
        document.body.style.cursor = 'unset';
      },
      resizeMouseMove(e) {
        if (this.draggingResizer) {
          const boundingRect = this.$refs['image-field'].getBoundingClientRect();
          const x = e.clientX - boundingRect.x;
          const y = e.clientY - boundingRect.y;

          // resize the image, maintaining aspect ratio
          this.image.width = Math.max(50, Math.floor(Math.sqrt(x * x + y * y)));
          this.image.height = Math.floor(this.image.width / this.aspectRatio);
        }
      },
      exitResizing() {
        this.resizing = false;
        this.draggingResizer = false;
      },
    },
    $trs: {
      editImageOption: 'Edit',
      resizeImageOption: 'Resize',
      removeImageOption: 'Remove',
    },
  };

</script>

<style scoped lang="less">

  @resizer-size: 24px;

  img {
    border: 1px solid var(--v-greyBorder-base);
  }
  .dragging {
    img {
      pointer-events: none;
      user-select: none;
    }
  }

  .resizing {
    user-select: none;
    * {
      user-select: none;
    }
    img {
      border: 4px solid var(--v-primary-base);
    }
  }

  .resizer {
    position: absolute;
    right: -@resizer-size / 2;
    bottom: 0;
    width: @resizer-size;
    height: @resizer-size;
    cursor: se-resize;
    user-select: none;
    background-color: var(--v-primary-base);
    border-radius: @resizer-size;
  }

  .edit-options {
    top: 4px;
    right: 4px;
    user-select: none;
    background-color: var(--v-backgroundColor--base);
    opacity: 0;

    // TUI will automatically move cursor inside button,
    // so don't allow clicking on elements inside the button
    /deep/ * {
      pointer-events: none;
    }

    /deep/ .v-btn__content {
      height: min-content;
    }

    i {
      font-style: normal;
    }
  }
  .image-field {
    position: relative;
    display: inline-block;
    width: max-content;
    vertical-align: middle;

    &:hover:not(.resizing) .edit-options,
    .edit-options:focus {
      opacity: 1;
    }
  }

</style>
