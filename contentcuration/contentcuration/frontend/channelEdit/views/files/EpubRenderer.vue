<template>

  <VLayout
    align-center
    fill-height
    row
    style="background-color: white"
  >
    <VFlex
      shrink
      class="px-2"
    >
      <IconButton
        icon="chevronLeft"
        text=""
        size="small"
        rtlFlip
        @click="rendition.prev()"
      />
    </VFlex>
    <div
      ref="epub"
      :style="{ height: '100%', width }"
    ></div>
    <VFlex
      shrink
      class="px-2"
    >
      <IconButton
        icon="chevronRight"
        text=""
        size="small"
        rtlFlip
        @click="rendition.next()"
      />
    </VFlex>
  </VLayout>

</template>


<script>

  import ePub from 'epubjs';
  import IconButton from 'shared/views/IconButton';

  export default {
    name: 'EpubRenderer',
    components: {
      IconButton,
    },
    props: {
      src: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        book: null,
        rendition: null,
      };
    },
    computed: {
      width() {
        return 'calc(100% - 96px)';
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.book = ePub(this.src);
        this.rendition = this.book.renderTo(this.$refs.epub, {
          manager: 'continuous',
          flow: 'paginated',
          width: this.width,
          height: '100%',
        });
        const displayed = this.rendition.display();
        displayed.then(() => {
          this.$emit('load');
        });
      }); // There seems to be some lag for loading, so add delay to be safe
    },
    beforeDestroy() {
      if (this.book) {
        /**
         * Destroy the book instance to remove listeners that causes some
         * ResizeObserver errors in the console on unmount.
         */
        this.book.destroy();
      }
    },
  };

</script>
