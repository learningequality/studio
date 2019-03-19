<template>

<div>
	<h4>{{ $tr('inviteText')}}</h4>
	<form @submit="submitEmail">
		<p v-if="shareError" class="message error">{{shareError}}</p>
		<p v-else-if="shareSuccess" class="message success">{{shareSuccess}}</p>
		<p v-else-if="sharing" class="message sending">{{ $tr('sendingIndicator') }}</p>
		<div class="email-input-area">
			<input type="text" dir="auto" ref="email" :placeholder="$tr('emailPlaceholder')" name="email">
			<select name="permission" ref="share_mode">
				<option
					v-for="permission in permissions"
					class="permission"
					:value="permission"
					:selected="currentUserPermission === permission"
				>{{ $tr(permission) }}</option>
			</select>
			<button
				type="submit"
				@click.prevent="submitEmail"
				:disabled="sharing"
				:class="{disabled: sharing}"
				:title="sharing? $tr('sendingIndicator') : $tr('inviteButton')"
			>{{ $tr('inviteButton') }}</button>
		</div>
	</form>

	<div v-if="currentUserPermission !== 'view'" class="share-view-list">
		<hr/>
		<AccessList/>
		<InvitationList/>
	</div>

</div>

</template>


<script>

	// TODO: disable share

import { mapGetters, mapActions, mapState } from 'vuex';
import { Permissions, PermissionRanks } from '../constants';
import AccessList from './AccessList.vue';
import InvitationList from './InvitationList.vue';
import State from 'edit_channel/state';
import { getPermission } from '../utils';
import _ from 'underscore';
import { dialog, alert } from 'edit_channel/utils/dialog';

export default {
  name: 'ShareView',
  $trs: {
    inviteText: 'Invite others to collaborate',
    [Permissions.OWNER]: "Can Manage",
    [Permissions.EDIT]: "Can Edit",
    [Permissions.VIEW_ONLY]: "Can View",
    emailPlaceholder: "Enter email address...",
    inviteButton: "Invite",
    sendingIndicator: "Sending invitation...",
    invitationSentMessage: "Invitation sent to {email}",
    resendHeader: "User Already Invited",
    resendPrompt: "This person has already been invited. Resend invitation?",
    upgradeHeader: "Granting Permissions",
    upgradePrompt: "This person already has viewing access. Would you like to grant editing permissions?",
    cancelButton: "Cancel",
    sendButton: "Send",
    grantButton: "Grant Access"
  },
  data() {
  	return {
  		shareError: "",
  		shareSuccess: "",
  		sharing: false
  	}
  },
  components: {
  	AccessList,
  	InvitationList,
  },
  computed: Object.assign(
  	mapGetters('share', ['channel', 'invitations', 'accessList']),
  	{
	  	currentUserPermission() {
	  		return getPermission(this.user, this.channel);
	  	},
	  	permissions() {
	  		let userRank = _.findWhere(PermissionRanks, { shareMode: this.currentUserPermission });
	  		return _.chain(PermissionRanks)
					.filter((permission) => { return permission.field && permission.rank <= userRank.rank; })
					.sortBy('rank')
					.pluck('shareMode')
					.value();
	  	},
	  	user() {
	  		return State.current_user.toJSON();
	  	}
	  }
  ),
  methods: Object.assign(
  	mapActions('share', ['sendInvitation']),
  	{
	  	submitEmail() {
	  		this.attemptSendInvitation();
	  	},
	  	promptUpgrade() {
	  		dialog(this.$tr('upgradeHeader'), this.$tr('upgradePrompt'), {
	  			[this.$tr('cancelButton')]: () => {},
	  			[this.$tr('grantButton')]: () => {
	  				this.attemptSendInvitation({upgrade: true});
	  			}
	  		});
	  	},
	  	promptReinvite() {
	  		dialog(this.$tr('resendHeader'), this.$tr('resendPrompt'), {
	  			[this.$tr('cancelButton')]: () => {},
	  			[this.$tr('sendButton')]: () => {
	  				this.attemptSendInvitation({reinvite: true});
	  			}
	  		});
	  	},
	  	attemptSendInvitation(data) {
	  		let email = this.$refs.email.value
	  		if(email.length) {
	  			this.shareError = "";
	  			let payload = {
	    			email: email,
	    			share_mode: this.$refs.share_mode.value,
	    			...data
	    		}
	    		this.sharing = true;
	    		this.sendInvitation(payload).then((data) => {
	    			this.sharing = false;
	    			if (data.prompt_to_upgrade) {
	    				this.promptUpgrade();
	    			} else if (data.reinvite) {
	    				this.promptReinvite();
	    			} else {
	    				this.shareSuccess = this.$tr("invitationSentMessage", {email: email});
	    				this.$refs.email.value = "";
	    			}
	    		}).catch((error) => {
	    			this.shareError = error;
	    			this.sharing = false;
	    		})
	  		}
	  	}
	  }
  )
}

</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';

/deep/ h4{
	font-weight:bold;
	font-size: 12pt;
	.count-badge {
		.gray-label;
    margin-left: 5px;
    vertical-align: top;
	}
}

.message {
	margin: 0px 20px;
  font-weight: bold;
  color: @gray-700;
  &.error {
  	color: @red-error-color;
  }
  &.success {
  	color: @blue-500;
  }
}

form {
	margin-bottom: 15px;
	.email-input-area {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-auto-flow: column;
		padding: 5px 20px;
		input[type='text'] {
			.input-form;
			font-size: 12pt;
			padding-left: 2px;
			margin-right: 10px;
			border-bottom: 2px solid @blue-500;
			&:hover, &:focus {
				border-width: 4px;
			}
		}
		select {
			background: transparent;
	    border: 2px solid @blue-500;
	    border-radius: 5px;
		}
		button {
			.action-button;
			margin-left: 5px;
			text-transform: uppercase;
			font-weight: bold;
		}
	}
}

.share-view-list {
	min-height: 100px;
}


</style>
