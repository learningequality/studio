<template>

  <div class="underlay">
    <ChannelCatalogFrontPage
      v-if="channelList.length > 1"
      ref="frontpage"
      class="page"
      :channelList="channelList"
    />
    <Details
      v-for="channelWithDetails in channelList"
      :key="channelWithDetails.id"
      ref="details"
      class="page"
      :details="channelWithDetails"
      :printing="true"
      :loading="false"
    />
  </div>

</template>

<script>

  import Details from '../details/Details';
  import { generatePdf } from '../../utils';
  import ChannelCatalogFrontPage from './ChannelCatalogFrontPage';

  export default {
    name: 'ChannelCatalogPrint',
    components: {
      ChannelCatalogFrontPage,
      Details,
    },
    props: {
      channelList: {
        type: Array,
        required: true,
      },
    },
    methods: {
      /*
       * @public
       */
      async savePDF(filename) {
        let doc;
        if (this.$refs.frontpage) {
          doc = await generatePdf(this.$refs.frontpage.$el, doc);
        }
        for (let i = 0; i < this.$refs.details.length; i++) {
          if (i < this.$refs.details.length - 1) {
            doc = await generatePdf(this.$refs.details[i].$el, doc);
          } else {
            doc = await generatePdf(this.$refs.details[i].$el, doc, { save: true, filename });
          }
        }
        return doc;
      },
    },
  };

</script>


<style lang="less" scoped>

  .underlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: -1000;
  }

  .page {
    min-width: 800px;
    max-width: 800px;
    padding: 20px;
    margin: 0;
  }

</style>
