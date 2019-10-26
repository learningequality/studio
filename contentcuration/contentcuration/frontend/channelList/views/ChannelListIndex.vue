<template>

  <VApp>
    <AppBar>
      <template #tabs>
        <VTab
          v-for="listType in lists"
          :key="listType.id"
          :to="getChannelLink(listType)"
        >
          <span v-if="listType === 'STARRED'"></span>
          {{ $tr(listType) }}
        </VTab>
        <VTab
          :to="channelSetLink"
        >
          {{ $tr("channelSets") }}
        </VTab>
      </template>
    </AppBar>
    <VContent>
      <VContainer fluid>
        <VCard v-if="invitations.length">
          <VList subheader>
            <VSubheader>{{ $tr('invitations') }}</VSubheader>
            <VListTile
              v-for="invitation in invitations"
              :key="invitation.id"
            >
              <VListTileContent>
                <VListTileTitle>{{ getInvitationText(invitation) }}</VListTileTitle>
              </VListTileContent>

              <VListTileAction v-if="!invitation.accepted && !invitation.declined">
                <VBtn icon :aria-label="$tr('accept')" @click="acceptInvitation(invitation.id)">
                  <VIcon color="green">
                    check
                  </VIcon>
                </VBtn>
              </VListTileAction>
              <VListTileAction>
                <VBtn
                  v-if="invitation.accepted || invitation.declined"
                  icon
                  :aria-label="$tr('clear')"
                  @click="invitation.accepted
                    || (invitation.declined ?
                      removeInvitation(invitation.id) : decline(invitation.id))"
                >
                  <VIcon color="red">
                    clear
                  </VIcon>
                </VBtn>
                <VBtn
                  v-else
                  icon
                  :aria-label="$tr('decline')"
                  @click="decline(invitation.id)"
                >
                  <VIcon color="red">
                    clear
                  </VIcon>
                </VBtn>
              </VListTileAction>
            </VListTile>
            <PrimaryDialog v-model="invitationDialog" :title="$tr('decliningInvitation')">
              {{ $tr('decliningInvitationMessage') }}
              <template v-slot:actions>
                <VBtn
                  @click="closeDecline"
                >
                  {{ $tr('cancel') }}
                </VBtn>
                <VBtn
                  @click="declineAndClose"
                >
                  {{ $tr('decline') }}
                </VBtn>
              </template>
            </PrimaryDialog>
          </VList>
        </VCard>
        <keep-alive>
          <router-view :key="$route.params.listType || 'collections'" />
        </keep-alive>
      </VContainer>
    </VContent>
  </VApp>

</template>


<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { InvitationShareModes, ListTypes, RouterNames } from '../constants';
  import AppBar from 'shared/views/AppBar';
  import PrimaryDialog from 'shared/views/PrimaryDialog';

  export default {
    name: 'ChannelListIndex',
    components: {
      AppBar,
      PrimaryDialog,
    },
    data() {
      return {
        invitationDialog: false,
        declineInvitationId: null,
      };
    },
    computed: {
      ...mapGetters('channelList', ['invitations']),
      lists() {
        return Object.values(ListTypes);
      },
      channelSetLink() {
        return { name: RouterNames.CHANNEL_SETS };
      },
    },
    created() {
      this.loadInvitationList();
    },
    methods: {
      ...mapMutations('channelList', {
        removeInvitation: 'REMOVE_INVITATION',
      }),
      ...mapActions('channelList', ['loadInvitationList', 'acceptInvitation', 'declineInvitation']),
      getInvitationText(invitation) {
        const messageParams = {
          channel: invitation.channel_name,
          firstname: invitation.sender.first_name,
          lastname: invitation.sender.last_name,
        };
        let messageId;
        if (invitation.accepted) {
          if (invitation.share_mode === InvitationShareModes.EDIT) {
            messageId = 'acceptedEditText';
          } else {
            messageId = 'acceptedViewText';
          }
        } else if (invitation.declined) {
          if (invitation.share_mode === InvitationShareModes.EDIT) {
            messageId = 'declinedEditText';
          } else {
            messageId = 'declinedViewText';
          }
        } else {
          messageParams.firstname = invitation.sender.first_name;
          messageParams.lastname = invitation.sender.last_name;
          if (invitation.share_mode === InvitationShareModes.EDIT) {
            messageId = 'editText';
          } else {
            messageId = 'viewText';
          }
        }
        return this.$tr(messageId, messageParams);
      },
      getChannelLink(listType) {
        const name = RouterNames.CHANNELS;
        return { name, params: { listType } };
      },
      decline(invitationId) {
        this.declineInvitationId = invitationId;
        this.invitationDialog = true;
      },
      declineAndClose() {
        this.declineInvitation(this.declineInvitationId).then(() => {
          this.closeDecline();
        });
      },
      closeDecline() {
        this.invitationDialog = false;
        this.declineInvitationId = null;
      },
    },
    $trs: {
      [ListTypes.EDITABLE]: 'My Channels',
      [ListTypes.VIEW_ONLY]: 'View-Only',
      [ListTypes.PUBLIC]: 'Public',
      [ListTypes.STARRED]: 'Starred',
      channelSets: 'Collections',
      /* eslint-disable kolibri/vue-no-unused-translations */
      editText: '{firstname} {lastname} has invited you to edit {channel}',
      viewText: '{firstname} {lastname} has invited you to view {channel}',
      acceptedEditText: 'Accepted invitation to edit {channel}',
      declinedEditText: 'Declined invitation to edit {channel}',
      acceptedViewText: 'Accepted invitation to view {channel}',
      declinedViewText: 'Declined invitation to view {channel}',
      /* eslint-enable */
      accept: 'Accept',
      decline: 'Decline',
      cancel: 'Cancel',
      clear: 'Clear',
      invitations: 'Channel invitations',
      decliningInvitation: 'Declining Invitation',
      decliningInvitationMessage: 'Are you sure you want to decline this invitation?',
    },
  };

</script>


<style lang="less" scoped>

</style>
