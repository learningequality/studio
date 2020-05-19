<template>

  <div class="underlay">
    <ChannelCatalogFrontPage v-if="channelList.length > 1" :channelList="channelList" />
    <Details v-for="channelWithDetails in channelList"
      :key="channelWithDetails.id"
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
      savePDF() {
        return generatePdf(this.$el);
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
    min-width: 800px;
    max-width: 800px;
  }

</style>
