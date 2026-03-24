<template>

  <div class="underlay">
    <ChannelCatalogFrontPage
      v-if="channelList.length > 1"
      ref="frontpage"
      class="page"
      :channelList="channelList"
      :style="pageStyle"
    />
    <StudioDetailsPanel
      v-for="channelWithDetails in channelList"
      :key="channelWithDetails.id"
      ref="details"
      class="page"
      :details="channelWithDetails"
      :printing="true"
      :loading="false"
      :style="pageStyle"
    />
  </div>

</template>


<script>

  import StudioDetailsPanel from '../details/StudioDetailsPanel';
  import { fitToScale, generatePdf } from '../../utils/helpers';
  import ChannelCatalogFrontPage from './ChannelCatalogFrontPage';

  export default {
    name: 'ChannelCatalogPrint',
    components: {
      ChannelCatalogFrontPage,
      StudioDetailsPanel,
    },
    provide: {
      printing: true,
    },
    props: {
      channelList: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        pageHeight: null,
        pageWidth: null,
      };
    },
    computed: {
      pageStyle() {
        const style = {
          minWidth: '1200px',
          maxWidth: '1200px',
        };
        if (this.pageHeight) {
          const heightStyle = `${this.pageHeight}px`;
          style.minHeight = heightStyle;
          style.maxHeight = heightStyle;
        }
        if (this.pageWidth) {
          const widthStyle = `${this.pageWidth}px`;
          style.minWidth = widthStyle;
          style.maxWidth = widthStyle;
        }
        return style;
      },
    },
    methods: {
      /**
       * @public
       */
      async savePDF(filename) {
        let pageHeight, pageWidth;
        const scale = [this.$refs.frontpage, ...this.$refs.details].reduce(
          (currentScale, component) => {
            if (component) {
              const boundingRect = component.$el.getBoundingClientRect();
              pageHeight = Math.max(pageHeight || 0, boundingRect.height);
              pageWidth = Math.max(pageWidth || 0, boundingRect.width);
              return fitToScale(component.$el.getBoundingClientRect(), currentScale);
            }
            return currentScale;
          },
          1,
        );

        this.pageHeight = pageHeight;
        this.pageWidth = pageWidth;

        await this.$nextTick();

        let doc;
        if (this.$refs.frontpage) {
          doc = await generatePdf(this.$refs.frontpage.$el, doc, { scale });
        }
        for (let i = 0; i < this.$refs.details.length; i++) {
          if (i < this.$refs.details.length - 1) {
            doc = await generatePdf(this.$refs.details[i].$el, doc, { scale });
          } else {
            doc = await generatePdf(this.$refs.details[i].$el, doc, {
              scale,
              save: true,
              filename,
            });
          }
        }
        return doc;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .underlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: -1000;
  }

  .page {
    padding: 40px;
    margin: 0;
  }

</style>
