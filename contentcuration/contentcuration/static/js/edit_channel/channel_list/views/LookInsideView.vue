<!-- TODO: REMOVE BACKBONE- Update with the rest of the details/views.js templates -->
<template>
  <div>
    <div v-if="loading" class="loading">
      {{ $tr('loading') }}
    </div>
    <div v-show="!loading" ref="lookinside">
      <!-- Channel details will be inserted here -->
    </div>
  </div>
</template>


<script>

  import _ from 'underscore';
  import { mapActions } from 'vuex';
  import { DetailsView } from 'edit_channel/details/views';

  export default {
    name: 'LookInsideView',
    $trs: {
      loading: 'Loading details...',
    },
    props: {
      nodeID: {
        type: String,
        required: true,
      },
      channel: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        loading: false,
      };
    },
    watch: {
      nodeID(newVal, oldVal) {
        if (newVal !== oldVal) {
          _.defer(this.loadDetails);
        }
      },
    },
    mounted() {
      this.loadDetails();
    },
    methods: {
      ...mapActions('channel_list', ['loadNodeDetails']),
      loadDetails() {
        this.loading = true;
        this.loadNodeDetails(this.nodeID).then(detailedNode => {
          new DetailsView({
            model: detailedNode,
            el: this.$refs.lookinside,
            channel: this.channel,
          });
          this.loading = false;
        });
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  .loading {
    padding: 100px 0;
    font-size: 20pt;
    font-style: italic;
    font-weight: bold;
    color: @gray-500;
    text-align: center;
    background-color: white;
    border: 2px solid @blue-200;
  }

</style>
