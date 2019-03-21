<template>

  <div v-if="invitation">
    <!-- User accepted or declined invitation -->
    <div v-if="accepted || declined" class="invitation" :class="{'accepted': accepted, 'declined': declined}">
      <div class="invite-text">{{(accepted)? acceptedText : declinedText}}</div>
      <div class="remove material-icons" @click="removeInvitation(invitationID)">clear</div>
    </div>

    <!-- Invitation is pending -->
    <div v-else class="invitation">
      <div class="invite-text">{{invitationText}}</div>
      <div class="invite-options">
        <a class="accept-invitation" @click="handleAccept">
          <span class="material-icons">check</span>
          {{ $tr('accept') }}
        </a>
        <a class="decline-invitation" @click="handleDecline">
          <span class="material-icons">clear</span>
          {{ $tr('decline') }}
        </a>
      </div>
    </div>
  </div>

</template>

<script>

import _ from 'underscore';
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import { ListTypes } from '../constants';
import dialog from 'edit_channel/utils/dialog';


export default {
  name: 'ChannelInvitationItem',
  $trs: {
    editText: '{firstname} {lastname} has invited you to edit {channel}',
    viewText: '{firstname} {lastname} has invited you to view {channel}',
    acceptedEditText: 'Accepted invitation to edit {channel}',
    declinedEditText: 'Declined invitation to edit {channel}',
    acceptedViewText: 'Accepted invitation to view {channel}',
    declinedViewText: 'Declined invitation to view {channel}',
    accept: 'Accept',
    decline: 'Decline',
    cancel: 'Cancel',
    invitationError: 'Invitation Error',
    decliningInvitation: 'Declining Invitation',
    decliningInvitationMessage: 'Are you sure you want to decline this invitation?'
  },

  props: {
    invitationID: {
      type: String,
      required: true,
    }
  },
  data() {
    return {
      accepted: false,
      declined: false
    }
  },
  computed: {
    ...mapGetters('channel_list', ['getInvitation', 'invitations']),
    invitation() {
      return this.getInvitation(this.invitationID);
    },
    acceptedText() {
      switch(this.invitation.share_mode) {
        case ListTypes.EDITABLE:
          return this.$tr('acceptedEditText', {channel: this.invitation.channel_name});
        default:
          return this.$tr('acceptedViewText', {channel: this.invitation.channel_name});
      }
    },
    declinedText() {
      switch(this.invitation.share_mode) {
        case ListTypes.EDITABLE:
          return this.$tr('declinedEditText', {channel: this.invitation.channel_name});
        default:
          return this.$tr('declinedViewText', {channel: this.invitation.channel_name});
      }
    },
    invitationText() {
      let messageArgs = {
        firstname: this.invitation.sender.first_name,
        lastname: this.invitation.sender.last_name,
        channel: this.invitation.channel_name
      };

      switch(this.invitation.share_mode) {
        case ListTypes.EDITABLE:
          return this.$tr('editText', messageArgs);
        default:
          return this.$tr('viewText', messageArgs);
      }
    }
  },
  methods: {
    ...mapMutations('channel_list', {
      removeInvitation: 'REMOVE_INVITATION',
    }),
    ...mapActions('channel_list', [
      'acceptInvitation',
      'declineInvitation'
    ]),
    handleAccept() {
      this.acceptInvitation(this.invitationID).then(() => {
        this.$emit('acceptedInvitation', this.invitation.share_mode);
        this.accepted = true;
      }).catch((error) => {
        console.error(error)
        dialog.alert(this.$tr("invitationError"), error.responseText || error);
      });
    },
    handleDecline() {
      dialog.dialog(this.$tr("decliningInvitation"), this.$tr("decliningInvitationMessage"), {
        [this.$tr("cancel")]:()=>{},
        [this.$tr("decline")]: () => {
          this.declineInvitation(this.invitationID).then(() => {
            this.declined = true;
          }).catch((error) => {
            console.error(error);
            dialog.alert(this.$tr("invitationError"), error);
          });
        },
      },()=>{});
    }
  }
};

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  @accepted-bg-color: #CEEFCE;
  @accepted-text-color: #2D6B2D;
  @declined-bg-color: #F7DCDC;
  @declined-text-color: #B72525;

  .invitation {
    .channel-list-width;
    margin-top: 10px;
    margin-bottom: 10px;
    font-size: 12pt;
    margin-bottom: 15px;
    padding: 8px 15px;
    background-color: @blue-100;
    color: @blue-900;
    border-radius: 5px;
    display: flex;

    &.accepted {
      background-color: @accepted-bg-color;
      color: @accepted-text-color;
    }
    &.declined {
      background-color: @declined-bg-color;
      color: @declined-text-color;
    }

    .invite-text {
      padding: 5px;
      flex-direction: column;
      flex: 2;
    }

    .remove {
      padding: 3px;
      cursor: pointer;
    }

    .invite-options {
        padding-top: 5px;
      a {
        .action-button;
        background-color: white;
        font-weight: bold;
        border: 2px solid white;
        text-transform: uppercase;
        margin: 0px 5px;
        &.accept-invitation {
          color: @blue-500;
          &:hover {
            border-color: @blue-500;
          }
        }
        &.decline-invitation {
          color: @red-error-color;
          &:hover {
            border-color: @red-error-color;
          }
        }
        span {
          font-weight: bold;
          font-size: 16pt;
          vertical-align: sub;
        }
      }
    }
  }

</style>
