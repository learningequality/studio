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
              <input type="text" placeholder="What are you looking for?"></input>
              <button type="submit" @click.prevent="noop">Search</button>
            </form>
          </div>
        </div>
        <div class="modal-body">
          <component is="ImportDialogue" :store="store" />
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
    },
    mounted() {
      this.openModal();
    },
    methods: {
      noop() {

      },
      openModal() {
        $(this.$refs.topmodal).modal({ show: true })
      },
      closeModal() {
        $(this.$refs.topmodal).modal('hide');
      }
    },
  }

</script>


<style lang="less" scoped>

</style>
