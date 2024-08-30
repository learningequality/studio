<template>

  <VLayout align-center fill-height row style="background-color: white;">
    <VFlex shrink class="px-2">
      <KIconButton
        icon="chevronLeft"
        tooltip=""
        size="small"
        @click="rendition.prev()"
      />
    </VFlex>
    <div ref="epub" :style="{ height: '100%', width }"></div>
    <VFlex shrink class="px-2">
      <KIconButton
        icon="chevronRight"
        tooltip=""
        size="small"
        @click="rendition.next()"
      />
    </VFlex>
  </VLayout>

</template>

<script>

  import ePub from 'epubjs';

  export default {
    name: 'EpubRenderer',
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
      }, 1000); // There seems to be some lag for loading, so add delay to be safe
    },
  };

</script>
