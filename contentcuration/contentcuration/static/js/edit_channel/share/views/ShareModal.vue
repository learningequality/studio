<template>

  <div ref="topmodal" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content modal-dialog-default">
        <div class="modal-header">
          <h4 class="modal-title">{{ $tr('modalHeader') }}</h4>
        </div>
        <div class="modal-body">
        	<ShareView :channel="channel"/>
        	<div class="modal-bottom">
				<a data-dismiss="modal">{{ $tr('closeButton') }}</a>
			</div>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

import { mapGetters } from 'vuex';
import ShareView from './ShareView.vue';

export default {
  name: 'ShareModal',
  $trs: {
    modalHeader: 'Share Channel',
    closeButton: 'Close'
  },
  components: {
    ShareView,
  },
  mounted() {
    this.openModal();
  },
  computed: mapGetters('share', ['channel']),
  methods: {
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
  }
}

</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';
.modal-dialog {
  width: 650px;
}
.modal-content {
	background-color: white;
}
.modal-header {
	background-color: @blue-200;
	.modal-title {
		font-weight: bold;
	}
}
.modal-body {
	min-height: 100px;
	.modal-bottom {
		padding:10px;
		padding-left:0;
		min-height: 35px;
		#share_change_indicator{
			display:none;
			font-style:italic;
			color:gray;
			margin-right:10px;
			margin-top:5px;
		}
	}
}
.modal-bottom {
	a {
		.action-text;
		text-transform: uppercase;
	}
}
</style>
