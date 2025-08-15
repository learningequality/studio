<template>

  <div>
    <h2 class="heading">
      {{ $tr('basicInfoHeader') }}
    </h2>

    <!-- User Information -->
    <KFixedGrid
      numCols="8"
      gutter="40"
    >
      <KFixedGridItem
        span="2"
        class="row"
      >
        <b>{{ $tr('usernameLabel') }}</b>
      </KFixedGridItem>
      <KFixedGridItem
        span="6"
        class="row"
      >
        {{ user.email }}
      </KFixedGridItem>
      <KFixedGridItem
        span="2"
        class="row"
      >
        <b>{{ $tr('fullNameLabel') }}</b>
      </KFixedGridItem>
      <KFixedGridItem
        span="6"
        class="row"
      >
        <span>
          {{ fullName }}
          <KButton
            class="px-2"
            data-test="edit-name-btn"
            appearance="basic-link"
            :text="$tr('editFullNameAction')"
            @click="showFullNameForm = true"
          />
        </span>
      </KFixedGridItem>
      <KFixedGridItem
        span="2"
        class="row"
      >
        <b>{{ $tr('passwordLabel') }}</b>
      </KFixedGridItem>
      <KFixedGridItem
        span="6"
        class="row"
      >
        <KButton
          data-test="change-password-btn"
          appearance="basic-link"
          :text="$tr('changePasswordAction')"
          @click="showPasswordForm = true"
        />
      </KFixedGridItem>
    </KFixedGrid>

    <!-- API Token -->
    <h2 class="heading">
      {{ $tr('apiTokenHeading') }}
    </h2>
    <p>
      {{ $tr('apiTokenMessage') }}
      <KExternalLink
        href="https://ricecooker.readthedocs.io/en/latest/index.html"
        openInNewTab
        :text="$tr('apiDocumentation')"
        rel="noopener noreferrer"
      />
    </p>
    <StudioCopyToken
      class="copy-token"
      :token="user.api_token || ' '"
      :loading="!user.api_token"
      :hyphenate="false"
    />

    <!-- Export data -->
    <h2 class="heading">
      {{ $tr('exportAccountDataHeading') }}
    </h2>
    <p>{{ $tr('exportAccountDataLabel') }}</p>
    <KButton
      data-test="export-link"
      :text="$tr('exportDataButton')"
      primary
      @click="startDataExport"
    />

    <!-- Account Deletion -->
    <h2 class="heading">
      {{ $tr('deleteAccountLabel') }}
    </h2>
    <p v-if="user.is_admin">
      {{ $tr('unableToDeleteAdminAccount') }}
    </p>
    <div v-else-if="channelsAsSoleEditor.length > 0">
      <p>{{ $tr('handleChannelsBeforeAccount') }}</p>
      <p
        v-for="channel in channelsAsSoleEditor"
        :key="channel.id"
      >
        <KExternalLink
          appearance="basic-link"
          :text="channel.name"
          :href="channelLink(channel.id)"
          class="notranslate"
        />
      </p>
    </div>
    <div v-else>
      <p>
        {{ $tr('completelyDeleteAccountLabel') }}
      </p>
      <KButton
        data-test="delete"
        :text="$tr('deleteAccountLabel')"
        :appearanceOverrides="{
          backgroundColor: $themeTokens.error,
          color: $themeTokens.textInverted,
          ':hover': {
            backgroundColor: $darken1($themeTokens.error),
          },
        }"
        @click="showDeleteConfirmation = true"
      />
    </div>

    <!-- Modal Dialogs -->
    <FullNameForm v-model="showFullNameForm" />
    <ChangePasswordForm v-model="showPasswordForm" />
    <DeleteAccountForm v-model="showDeleteConfirmation" />

    <KModal
      v-if="showExportDataNotice"
      :submitText="$tr('exportDataBtn')"
      :title="$tr('exportStartedHeader')"
      data-test="export-notice"
      @submit="showExportDataNotice = false"
    >
      {{ $tr('exportAccountDataModalMessage') }}
    </KModal>
  </div>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import FullNameForm from './FullNameForm';
  import ChangePasswordForm from './ChangePasswordForm';
  import DeleteAccountForm from './DeleteAccountForm';
  import StudioCopyToken from './StudioCopyToken.vue';

  export default {
    name: 'Account',
    components: {
      ChangePasswordForm,
      FullNameForm,
      DeleteAccountForm,
      StudioCopyToken,
    },
    data() {
      return {
        showFullNameForm: false,
        showPasswordForm: false,
        showExportDataNotice: false,
        showDeleteConfirmation: false,
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      ...mapState('settings', ['channels']),
      fullName() {
        return `${this.user.first_name} ${this.user.last_name}`;
      },
      // This returns the list of channels where the current users
      // is the only person with edit permissions for the channel.
      // This was initially added and is used for ensuring accounts
      // are not deleted without deleting such channels or first
      // inviting another user to have the rights to such channels
      channelsAsSoleEditor() {
        return this.channels.filter(c => c.editor_count === 1);
      },
    },
    methods: {
      ...mapActions('settings', ['exportData']),
      startDataExport() {
        this.exportData()
          .then(() => {
            this.showExportDataNotice = true;
          })
          .catch(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('exportFailed') });
          });
      },
      channelLink(id) {
        return window.Urls.channel(id);
      },
    },
    $trs: {
      basicInfoHeader: 'Basic Information',
      usernameLabel: 'Username',
      fullNameLabel: 'Full name',
      passwordLabel: 'Password',
      changePasswordAction: 'Change password',
      editFullNameAction: 'Edit full name',

      // Delete account strings
      deleteAccountLabel: 'Delete account',
      completelyDeleteAccountLabel: 'Completely remove your account from Kolibri Studio',
      unableToDeleteAdminAccount: 'Unable to delete an admin account',
      handleChannelsBeforeAccount:
        'You cannot delete accounts that have channels. You must delete these channels manually before you can delete your account.',

      // API strings
      apiTokenHeading: 'API Token',
      apiTokenMessage:
        'You will need this access token to run content integration scripts for bulk-uploading materials through the Kolibri Studio API.',
      apiDocumentation: 'API documentation',

      // Export strings
      exportAccountDataLabel:
        'You will receive an email with all information linked to your account',
      exportStartedHeader: 'Data export started',
      exportAccountDataHeading: 'Export account data',
      exportDataButton: 'Export data',
      exportAccountDataModalMessage:
        "You'll receive an email with your data when the export is completed",
      exportFailed: 'Unable to export data. Please try again.',
      exportDataBtn: 'OK',
    },
  };

</script>


<style scoped>

  .heading {
    margin-top: 32px;
  }

  .copy-token {
    width: 600px;
    max-width: 75%;
  }

  .row {
    padding: 8px 0;
  }

</style>
