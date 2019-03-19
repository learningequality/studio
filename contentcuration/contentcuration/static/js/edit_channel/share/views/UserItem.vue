<template>
<share-item :model="model" :permission="userPermission">
	<span v-if="isSelf">
		<span v-if="userPermission === 'manage'">
			<span v-if="isOnlyEditor" class="option leave disabled" :title="$tr('cannotRemoveTitle')" disabled>remove_circle_outline</span>
      <span v-else-if="canJoin" class="option join" :title="$tr('joinTitle')" @click="joinChannel">person_add</span>
			<span v-else class="option red-option leave" :title="$tr('leaveTitle')" @click="removeEditor(true)">remove_circle_outline</span>
		</span>
		<span v-else>
			<label>{{ $tr('youLabel') }}</label>
		</span>
	</span>
	<span v-else-if="currentUserPermission === 'manage'">
		<span v-if="isOnlyEditor" class="option disabled" :title="$tr('cannotRemoveTitle')" disabled>clear</span>
		<span v-else class="option red-option remove" :title="$tr('removeTitle')" @click="removeEditor(false)">clear</span>
	</span>
</share-item>

</template>

<script>

import { mapGetters, mapActions } from 'vuex';
import _ from 'underscore';
import { dialog, alert } from 'edit_channel/utils/dialog';
import State from 'edit_channel/state';
import { getPermission, getHighestPermission } from '../utils';
import ShareItem from './ShareItem.vue';

export default {
  name: 'UserItem',
  $trs: {
    youLabel: "You",
    leaveTitle: "Leave Channel",
    removeTitle: "Remove from channel",
    joinTitle: "Join Channel",
    removingHeader: "Removing User",
    removingPrompt: "Are you sure you want to remove {name} from the channel?",
    remove: "Remove",
    cancel: "Cancel",
    userName: "{firstName} {lastName}",
    cannotRemoveTitle: "Cannot remove only editor for this channel",
    leavingHeader: "Leaving Channel",
    leavingPrompt: "Leaving this channel will remove it from your channel list. Continue?",
    leave: "Leave",
    failedHeader: "Error",
    joiningHeader: "Joining Channel",
    joiningPrompt: "By joining this channel, you will be listed as an editor and have access to it in your channel list. Continue?",
    join: "Join"
  },
  extends: ShareItem,
  components: {
	  ShareItem,
	},
  computed: Object.assign(
  	mapGetters('share', ['channel', 'accessList']),
  	{
      isSelf() {
        return this.model.id === State.current_user.id;
      },
  		canJoin() {
  			// Only admins can join channels they're not a part of
        return this.model.is_admin && !_.findWhere(this.accessList, {id: this.model.id});
	  	},
	  	isOnlyEditor() {
        // Check length of highest permission rank
        let topLevel = getHighestPermission();
	  		return this.channel[topLevel.field].length === 1;
	  	},
	  	userPermission() {
	  		return getPermission(this.model, this.channel);
	  	},
	  	currentUserPermission() {
	  		return getPermission(State.current_user.toJSON(), this.channel);
	  	}
  	}
  ),
  methods: Object.assign(
  	mapActions('share', ['addEditor', 'removeUser']),
	  {
	  	removeEditor(isLeaving) {
	  		let header = (isLeaving)? this.$tr("leavingHeader") : this.$tr("removingHeader");
	  		let prompt = (isLeaving)? this.$tr("leavingPrompt") : this.$tr("removingPrompt", {name: this.userName});
	  		let actionButton = (isLeaving)? this.$tr("leave") : this.$tr("remove");

	      dialog(header, prompt, {
          [this.$tr("cancel")]:() => {},
          [actionButton]: () => {
            this.removeUser(this.model)
            		.catch((error) => {alert(this.$tr('failedHeader'), error)} );
        	}
	      });
	  	},
	  	joinChannel() {
	  		dialog(this.$tr("joiningHeader"), this.$tr("joiningPrompt"), {
          [this.$tr("cancel")]:() => {},
          [this.$tr("join")]: () => {
            this.addEditor(this.model)
            		.catch((error) => {alert(this.$tr('failedHeader'), error)} );
        	}
	      });
	  	}
	  }
	)
}

</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';
.disabled:hover {
	color: @gray-700 !important;
}
</style>
