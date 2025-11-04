<template>

  <VCard
    v-if="loading"
    flat
    style="min-height: 500px"
  >
    <LoadingText absolute />
  </VCard>
  <div v-else>
    <h1 class="font-weight-bold title">
      {{ $tr('inviteSubheading') }}
    </h1>
    <VForm
      ref="form"
      style="max-width: 600px"
      class="py-4"
      @submit.prevent="submitEmail"
    >
      <VLayout
        row
        align-top
      >
        <VFlex
          grow
          class="pr-2"
        >
          <VTextField
            v-model="email"
            box
            color="primary"
            maxlength="100"
            counter
            :label="$tr('emailLabel')"
            :error-messages="error ? [error] : []"
            @input="error = null"
          />
        </VFlex>
        <DropdownWrapper
          component="VFlex"
          shrink
          :menuHeight="120"
        >
          <template #default="{ attach, menuProps }">
            <VSelect
              v-model="shareMode"
              box
              color="primary"
              menu-props="offsetY"
              :items="permissions"
              item-value="id"
              item-text="text"
              style="max-width: 200px"
              single-line
              hide-details
              :attach="attach"
              :menuProps="menuProps"
            />
          </template>
        </DropdownWrapper>
      </VLayout>
      <KButton
        type="submit"
        :disabled="sharing"
        primary
      >
        {{ $tr('inviteButton') }}
      </KButton>
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
  import { SharingPermissions } from 'shared/constants';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  export default {
    name: 'ChannelSharing',
    components: {
      DropdownWrapper,
      LoadingText,
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
        shareMode: SharingPermissions.EDIT,
        error: null,
        sharing: false,
      };
    },
    computed: {
      ...mapGetters('channel', ['checkUsers', 'checkInvitations']),
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
      this.loading = true;
      this.loadChannelUsers(this.channelId).then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channel', ['loadChannelUsers', 'sendInvitation']),
      validate() {
        if (!this.email.trim()) {
          this.error = this.$tr('emailRequiredMessage');
        } else if (!/^[^(),:;<>@[\\\]]{1,64}@\[?[A-Za-z0-9\-().]+\]?$/.test(this.email)) {
          this.error = this.$tr('validEmailMessage');
        } else if (this.checkUsers(this.channelId, this.email)) {
          this.error = this.$tr('alreadyHasAccessError');
        } else if (this.checkInvitations(this.channelId, this.email)) {
          this.error = this.$tr('alreadyInvitedError');
        }
        return !this.error;
      },
      async submitEmail() {
        this.error = null;
        if (this.validate()) {
          this.sharing = true;
          try {
            await this.sendInvitation({
              email: this.email,
              shareMode: this.shareMode,
              channelId: this.channelId,
            });

            this.sharing = false;
            this.$store.dispatch('showSnackbar', { text: this.$tr('invitationSentMessage') });
            this.email = '';
            this.$refs.form.resetValidation();
          } catch (e) {
            this.sharing = false;
            this.error = this.$tr('invitationFailedError');
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
      validEmailMessage: 'Please enter a valid email',
      emailRequiredMessage: 'Email is required',
      alreadyInvitedError: 'User already invited',
      alreadyHasAccessError: 'User already has access to this channel',
      invitationFailedError: 'Invitation failed to send. Please try again',
      invitationSentMessage: 'Invitation sent',
    },
  };

</script>


<style lang="scss" scoped>

  .v-select .v-input__slot {
    height: 56px;
  }

</style>
