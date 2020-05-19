<template>

  <div class="underlay">
    <ChannelCatalogFrontPage v-if="channelList.length > 1" />
    <Details v-for="channelWithDetails in channelList" :details="channelWithDetails" :printing="true" :loading="false" />
  </div>

</template>

<script>

  import Details from '../details/Details';
  import ChannelCatalogFrontPage from './ChannelCatalogFrontPage';
  import { generatePdf } from '../../utils';

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
      }
    }
  };

</script>


<style lang="less" scoped>

  .underlay {
    postion: fixed;
    top: 0;
    left: 0;
    min-width: 800px;
    max-width: 800px;
    z-index: -1000;
  }

</style>
