<template>

  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content modal-dialog-default" id="import_modal_content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
          <h4 class="modal-title">Import from Another Channel</h4>
          <div>
            <form @submit="noop">
              <input v-model="searchTerm" type="text" placeholder="What are you looking for?"></input>
              <button type="submit" @click.prevent="noop">Search</button>
            </form>
          </div>
        </div>
        <div class="modal-body">
          <ImportDialogue :store="store">
            <component :is="pageType" :store="store" :channels="channels" />
          </ImportDialogue>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      store: {
        type: Object,
        required: true,
      }
    },
    components: {
      ImportDialogue: require('./ImportDialogue.vue'),
      ImportChannelList: require('./ImportChannelList.vue'),
      SearchResults: require('./SearchResults.vue'),
    },
    data: function() {
      return {
        searchTerm: '',
        channels: [],
      };
    },
    mounted() {
      this.openModal();
      this.loadChannels();
    },
    computed: {
      pageType: function() {
        if (this.store.pageState.type === 'tree_view') {
          return 'ImportChannelList';
        } else if (this.store.pageState.type === 'search_results') {
          return 'SearchResults'
        }
      }
    },
    methods: {
      noop() {
        this.store.goToSearchResults(this.searchTerm);
      },
      openModal() {
        $(this.$refs.topmodal).modal({ show: true })
      },
      closeModal() {
        $(this.$refs.topmodal).modal('hide');
      },
      loadChannels() {
        return this.store.fetchChannelRoots()
        .then((channelRoots) => {
          const collection = channelRoots;
          collection.forEach((node) => {
            node.set('title', node.get('channel_name'));
          });
          this.channels = collection.toJSON();
        })
        .catch((err) => {
          console.error(err); // eslint-disable-line
        })
      },
    },
  }

</script>


<style lang="less" scoped>

</style>
