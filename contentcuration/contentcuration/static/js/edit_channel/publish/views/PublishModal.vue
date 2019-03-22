<template>

  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content modal-dialog-default">
        <div class="modal-body">
          <PublishView/>
          <div class="modal-bottom">
            <a data-dismiss="modal" class="action-text">{{ $tr('cancelButton') }}</a>
            <button
              class="action-button"
              :class="{disabled: !channel.language}"
              :disabled="!channel.language"
              @click="publishChannel"
            >{{ $tr('publishButton') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

import { mapActions, mapState } from 'vuex';
import PublishView from './PublishView.vue';

export default {
  name: 'PublishModal',
  $trs: {
    modalHeader: 'Publish Channel',
    cancelButton: 'CANCEL',
    publishButton: 'PUBLISH'
  },
  components: {
    PublishView,
  },
  mounted() {
    this.openModal();
  },
  computed: mapState('publish', ['channel']),
  methods: {
    ...mapActions('publish', ['publishChannel']),
    openModal() {
      $(this.$refs.topmodal)
        .modal({ show: true })
        .on('hide.bs.modal', (event) => {
          // Check for changes
          this.$emit('modalclosing', event);
        })
        .on('hidden.bs.modal', () => {
          // Event to tell BB View to cleanup
          this.$emit('modalclosed');
        });
    },
    closeModal() {
      $(this.$refs.topmodal).modal('hide');
    },
    handlePublish() {
      this.publishChannel();
    }
  }
}

</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';
.modal-dialog{
  width: 600px;
}
.modal-content {
  background-color: white;
  .modal-bottom {
    display: grid;
    grid-auto-flow: column;
    justify-content: space-between;
  }
}

</style>
