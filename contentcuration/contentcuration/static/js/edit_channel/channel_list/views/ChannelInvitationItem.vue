<template>

  <div>
    <!-- User accepted invitation -->
    <div v-if="accepted" class="invitation accepted">
      <div class="invite-text">
        <span v-if="invitation.share_mode === 'edit'">{{ $tr('acceptedEditText', {channel: invitation.channel_name})}}</span>
        <span v-else>{{ $tr('acceptedViewText', {channel: invitation.channel_name})}}</span>
      </div>
      <div class="remove material-icons" @click="removeInvitation(invitation.id)">clear</div>
    </div>

    <!-- User declined invitation -->
    <div v-else-if="declined" class="invitation declined">
       <div class="invite-text">
        <span v-if="invitation.share_mode === 'edit'">{{ $tr('declinedEditText', {channel: invitation.channel_name})}}</span>
        <span v-else>{{ $tr('declinedViewText', {channel: invitation.channel_name})}}</span>
      </div>
      <div class="remove material-icons" @click="removeInvitation(invitation.id)">clear</div>
    </div>

    <!-- Invitation is pending -->
    <div v-else class="invitation">
      <div class="invite-text">
        <span v-if="invitation.share_mode === 'edit'">
          {{ $tr('editText', {firstname: invitation.sender.first_name, lastname: invitation.sender.last_name, channel: invitation.channel_name})}}
        </span>
        <span v-else>
          {{ $tr('viewText', {firstname: invitation.sender.first_name, lastname: invitation.sender.last_name, channel: invitation.channel_name})}}
        </span>
      </div>
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
import dialog from 'edit_channel/utils/dialog';


export default {
  name: 'ChannelSetItem',
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
    invitation: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
      accepted: false,
      declined: false
    }
  },
  methods: Object.assign(
    mapMutations('channel_list', {
      removeInvitation: 'REMOVE_INVITATION',
    }),
    mapActions('channel_list', [
      'acceptInvitation',
      'declineInvitation'
    ]),
    {
      handleAccept() {
        this.acceptInvitation(this.invitation).then(() => {
          this.accepted = true;
        }).catch((error) => {
          console.log("ERROR")
          dialog.alert(this.$tr("invitationError"), error);
        });
      },
      handleDecline() {
        dialog.dialog(this.$tr("decliningInvitation"), this.$tr("decliningInvitationMessage"), {
          [this.$tr("cancel")]:()=>{},
          [this.$tr("decline")]: () => {
            this.declineInvitation(this.invitation).then(() => {
              this.declined = true;
            }).catch((error) => {
              dialog.alert(this.$tr("invitationError"), error);
            });
          },
        },()=>{});
      }
    }
  )
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
