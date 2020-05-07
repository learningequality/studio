<template>

  <div>
    <h2 class="heading">
      Basic Information
    </h2>

    <!-- User Information -->
    <KFixedGrid numCols="8" gutter="40">
      <KFixedGridItem span="2" class="row">
        <b>{{ $tr('usernameLabel') }}</b>
      </KFixedGridItem>
      <KFixedGridItem span="6" class="row">
        {{ user.email }}
      </KFixedGridItem>
      <KFixedGridItem span="2" class="row">
        <b>{{ $tr('fullNameLabel') }}</b>
      </KFixedGridItem>
      <KFixedGridItem span="6" class="row">
        <span>
          {{ fullName }}
          <KButton 
            appearance="basic-link" 
            :text="$tr('editFullNameAction')" 
            @click="showFullNameForm = !showFullNameForm" 
          />
        </span>
      </KFixedGridItem>
      <KFixedGridItem span="2" class="row">
        <b>{{ $tr('passwordLabel') }}</b>
      </KFixedGridItem>
      <KFixedGridItem span="6" class="row">
        <KButton 
          appearance="basic-link" 
          :text="$tr('changePasswordAction')"
          @click="showPasswordForm = !showPasswordForm" 
        />
      </KFixedGridItem>
    </KFixedGrid>

    <!-- API Token -->
    <h2 class="heading">
      {{ $tr('apiTokenHeading') }}
    </h2>
    <p style="color: red">
      {{ $tr('apiTokenMessage') }}
    </p>
    <CopyToken 
      class="copy-token" 
      :token="user.api_token" 
      :hyphenate="false" 
    />

    <h2 class="heading-export">
      {{ $tr('exportAccountDataHeading') }}
    </h2>
    <p>{{ $tr('exportAccountDataLabel') }}</p>
    <KButton text="Export data" primary @click="startDataExport" />

    <!-- Account Deletion -->
    <h2 class="heading">
      {{ $tr('deleteAccountLabel') }}
    </h2>
    <div v-if="channelsAsSoleEditor.length > 0">
      <p>{{ $tr('handleChannelsBeforeAccount') }}</p>
      <p v-for="channel in channelsAsSoleEditor" :key="channel.id">
        <!--
          TODO: RESOLVE AND REMOVE THIS COMMENT

          This sends users to /channels
          I didn't see the ability to delete a channel any other way?
        -->
        <KExternalLink appearance="basic-link" :text="channel.name" href="/channels" />
      </p>
    </div>
    <div v-else>
      <p>
        {{ $tr('completelyDeleteAccountLabel') }}
      </p>
      <KButton 
        :text="$tr('deleteAccountLabel')" 
        :appearanceOverrides="{ 
          backgroundColor: this.$themeTokens.error, 
          color: this.$themeTokens.textInverted 
        }" 
        @click="showDeleteConfirmation = true" 
      />
    </div>

    <!-- Modal Dialogs -->
    <FullNameForm :show="showFullNameForm" @hideFullNameForm="showFullNameForm = false" />
    <ChangePasswordForm v-if="showPasswordForm" @hidePasswordForm="showPasswordForm = false" />
    <PrimaryDialog :value="showExportDataNotice" title="Data export started">
      <p>{{ $tr('exportAccountDataModalMessage') }}</p>
      <div slot="actions" style="text-align: right;">
        <KButton
          primary
          :text="$tr('okayAction')"
          @click="showExportDataNotice = !showExportDataNotice"
        />
      </div>
    </PrimaryDialog>

    <PrimaryDialog :value="showDeleteConfirmation" title="Data export started">
      <p>{{ $tr('deleteAccountConfirmationPrompt') }}</p>
      <p>{{ $tr('deleteAccountEnterEmail') }}</p>
      <KTextbox 
        v-model="accountDeletionEmail" 
        :label="$tr('emailAddressLabel')" 
        :invalid="deletionEmailIsInvalid" 
      />
      <div slot="actions" style="text-align: right;">
        <KButton
          primary
          :text="$tr('okayAction')"
          @click="deleteAccount"
        />
      </div>
    </PrimaryDialog>
  </div>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import FullNameForm from './FullNameForm';
  import ChangePasswordForm from './ChangePasswordForm';
  import client from 'shared/client';
  import CopyToken from 'shared/views/CopyToken';
  import PrimaryDialog from 'shared/views/PrimaryDialog';

  export default {
    name: 'Account',
    components: { ChangePasswordForm, CopyToken, FullNameForm, PrimaryDialog },
    data() {
      return {
        showFullNameForm: false,
        showPasswordForm: false,
        showExportDataNotice: false,
        showDeleteConfirmation: false,
        deletionEmailIsInvalid: false,
        accountDeletionEmail: '',
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      ...mapGetters(['channelsAsSoleEditor']),
      fullName() {
        return `${this.user.first_name} ${this.user.last_name}`;
      },
    },
    methods: {
      startDataExport() {
        const email = this.user.email;
        client
          .post(window.Urls.export_user_data(email))
          .then(() => (this.showExportDataNotice = true))
          .catch(e => window.alert(`Could not start data export ${e}`));
      },
      deleteAccount() {
        const email = this.user.email;
        if (email === this.accountDeletionEmail) {
          client
            .post(window.Urls.delete_user_account(email))
            .then(() => (window.location = '/'))
            .catch(() =>
              window.alert(
                'Failed to delete your account. Please contact us here: https://community.learningequality.org.'
              )
            );
        } else {
          this.deletionEmailIsInvalid = true;
        }
      },
    },
    $trs: {
      usernameLabel: 'Username',
      fullNameLabel: 'Full name',
      passwordLabel: 'Password',
      changePasswordAction: 'Change password',
      editFullNameAction: 'Edit',
      deleteAccountLabel: 'Delete account',
      deleteAccountConfirmationPrompt:
        'Are you sure you want to permanently delete your account? This cannot be undone',
      deleteAccountEnterEmail: 'Enter your email address to continue',
      handleChannelsBeforeAccount:
        'You must delete these channels manually or invite others to edit them before you can delete your account.',
      apiTokenHeading: 'API Token',
      apiTokenMessage:
        'You can use this code to...Ut aliquam ornare turpis, aliquam ornare purus gravida sed. Nullam imperdiet iaculis tincidunt. NEED COPY FOR THIS',
      exportAccountDataLabel:
        'You will be sent an email with all information linked to your account',
      completelyDeleteAccountLabel: 'Completely remove your account from Kolibri Studio',
      exportAccountDataHeading: 'Export account data',
      exportAccountDataModalMessage: "You'll receive an email with your information when it's done",
      okayAction: 'Okay',
      emailAddressLabel: 'Email address',
    },
  };

</script>

<style scoped>

.heading {
  margin-top: 24px;
  margin-bottom: 8px;
}

.heading-export {
  margin-top: 40px;
  margin-bottom: 8px;
}

.copy-token {
  height: 36px;
  width: 600px;
  max-width: 75%;
}

.row {
  padding: 8px 0;
}

</style>
