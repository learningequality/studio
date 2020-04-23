<template>

  <VCard v-if="loading" flat style="min-height: 500px;">
    <LoadingText absolute />
  </VCard>
  <div v-else>
    <h1 class="font-weight-bold title">
      {{ $tr('inviteSubheading') }}
    </h1>
    <VForm
      ref="form"
      style="max-width: 600px;"
      lazy-validation
      class="py-4"
      @submit.prevent="submitEmail"
    >
      <VLayout row align-top>
        <VFlex grow class="pr-2">
          <EmailField
            v-model="email"
            outline
            color="primary"
            :label="$tr('emailLabel')"
            :error-messages="error? [error] : []"
            @input="error = null"
          />
        </VFlex>
        <VFlex shrink>
          <VSelect
            v-model="shareMode"
            outline
            color="primary"
            menu-props="offsetY"
            :items="permissions"
            item-value="id"
            item-text="text"
            style="max-width: 200px;"
            single-line
            hide-details
          />
        </VFlex>
      </VLayout>
      <VBtn color="primary" type="submit" :disabled="sharing">
        {{ $tr('inviteButton') }}
      </VBtn>
    </VForm>

    <ChannelSharingTable
      v-for="permission in permissions"
      :key="`sharing-table-${permission.id}`"
      :mode="permission.id"
      :channelId="channelId"
    />
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import ChannelSharingTable from './ChannelSharingTable';
  import LoadingText from 'shared/views/LoadingText';
  import EmailField from 'shared/views/form/EmailField';
  import { SharingPermissions } from 'shared/constants';

  export default {
    name: 'ChannelSharing',
    components: {
      LoadingText,
      EmailField,
      ChannelSharingTable,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        email: '',
        loading: false,
        shareMode: SharingPermissions.VIEW_ONLY,
        error: null,
        sharing: false,
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel', 'checkUsers', 'checkInvitations']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      permissions() {
        return [
          {
            id: SharingPermissions.EDIT,
            text: this.$tr('canEdit'),
          },
          {
            id: SharingPermissions.VIEW_ONLY,
            text: this.$tr('canView'),
          },
        ];
      },
    },
    mounted() {
      if (this.channel.edit) {
        this.shareMode = SharingPermissions.EDIT;
      }
      this.loading = true;
      this.loadChannelUsers(this.channelId).then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channel', ['loadChannelUsers', 'sendInvitation']),
      submitEmail() {
        this.error = null;
        if (this.$refs.form.validate()) {
          if (this.checkUsers(this.channelId, this.email)) {
            this.error = this.$tr('alreadyHasAccessError');
          } else if (this.checkInvitations(this.channelId, this.email)) {
            this.error = this.$tr('alreadyInvitedError');
          } else {
            this.sharing = true;
            this.sendInvitation({
              email: this.email,
              shareMode: this.shareMode,
              channelId: this.channelId,
            })
              .then(() => {
                this.sharing = false;
                this.$store.dispatch('showSnackbar', { text: this.$tr('invitationSentMessage') });
                this.email = '';
                this.$refs.form.resetValidation();
              })
              .catch(() => {
                this.sharing = false;
                this.error = this.$tr('invitationFailedError');
              });
          }
        }
      },
    },
    $trs: {
      inviteSubheading: 'Invite collaborators',
      emailLabel: 'Email',
      canEdit: 'Can edit',
      canView: 'Can view',
      inviteButton: 'Send invitation',
      alreadyInvitedError: 'User already invited',
      alreadyHasAccessError: 'User already has access to this channel',
      invitationFailedError: 'Unable to send your invitation. Please try again',
      invitationSentMessage: 'Invitation sent',
    },
  };

</script>


<style lang="less" scoped>

  .v-select .v-input__slot {
    height: 56px;
  }

</style>
