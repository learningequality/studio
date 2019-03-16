<template>

<share-item :model="model" :permission="model.share_mode" :highlight="recentlySent === model.id">
	<label v-if="recentlySent === model.id">{{ $tr('sentIndicator') }}</label>
	<span class="option reinvite" :title="$tr('reinviteTitle')" @click="reinviteUser">mail_outline</span>
	<span class="option red-option remove" :title="$tr('cancelInviteTitle')" @click="uninviteUser">clear</span>
</share-item>

</template>

<script>

import { mapGetters, mapActions } from 'vuex';
import { dialog } from 'edit_channel/utils/dialog';
import ShareItem from './ShareItem.vue';

export default {
  name: 'InvitationItem',
  $trs: {
    reinviteTitle: "Resend Invitation",
    cancelInviteTitle: "Cancel Invitation",
    resendPrompt: "Send invitation to {name} again?",
    resendHeader: "Pending Invitation",
    invitationFailedText: "Failed to send invitation",
    sentIndicator: "Sent!",
    sendButton: "Send",
    cancelButton: "Cancel",
    uninvitingHeader: "Uninviting User",
    uninvitingPrompt: "Are you sure you want to uninvite {name}?",
    uninviteButton: "Uninvite",
    userName: "{firstName} {lastName}"
  },
  extends: ShareItem,
  components: {
	  ShareItem,
	},
  computed: mapGetters('share', ['recentlySent']),
  methods: Object.assign(
  	mapActions('share', ['sendInvitation', 'deleteInvitation']),
	  {
	  	reinviteUser() {
       	dialog(this.$tr('resendHeader'), this.$tr('resendPrompt', {name: this.userName.trim()}), {
          [this.$tr('cancelButton')]: () => {},
          [this.$tr('sendButton')]: () => {
        		this.handleSendInvitation();
          },
        }, null);
	  	},
      handleSendInvitation() {
        let payload = {
          email: this.model.email,
          share_mode: this.model.share_mode,
          reinvite: true
        }
        this.sendInvitation(payload);
      },
	  	uninviteUser() {
        dialog(this.$tr("uninvitingHeader"), this.$tr("uninvitingPrompt", {name: this.userName.trim()}), {
            [this.$tr('cancelButton')]: () => {},
            [this.$tr('uninviteButton')]: () => {
            	this.deleteInvitation(this.model);
            },
        }, null);
	  	}
	  }
  )
}

</script>


<style lang="less" scoped>

</style>
