<template>

  <div>
    <h2 class="heading">Basic Information</h2>
    <div>

    </div>
    <p>
      <span><b>Username</b></span>
      <span>
        {{ $store.state.session.currentUser.email }}
      </span>
    </p>
    <p>
      <span><b>Full name</b></span>
      <span>{{ fullName }}</span>
      <span>
        <KButton appearance="basic-link" text="Edit" @click="showFullNameForm = !showFullNameForm" />
      </span>
    </p>
    <p>
      <span><b>Password</b></span>
      <span>
        <KButton appearance="basic-link" text="Change password" @click="showPasswordForm = !showPasswordForm" />
      </span>
    </p>

    <h2 class="heading">API Token</h2>
    <p>You can use this code to LOREM IPSUM... do things..</p>
    <CopyToken class="copy-token" :token="$store.state.session.currentUser.api_token" :hyphenate="false" />

    <h2 class="heading">Export account data</h2>
    <p>You will be sent an email with all information linked to your account</p>
    <KButton text="Export data" primary @click="startDataExport" />

    <h2 class="heading">Delete account</h2>
    <div v-if="channelsAsSoleEditor.length > 0">
      <p>You must delete these channels manually or invite others to edit them before you can delete your account.</p>
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
      <p>Completely remove your account from Kolibri Studio</p>
      <KButton text="Delete account" :appearanceOverrides="{ backgroundColor: this.$themeTokens.error, color: this.$themeTokens.textInverted }" @click="showDeleteConfirmation = true" />
    </div>

    <!-- Modal Dialogs -->
    <FullNameForm :show="showFullNameForm" @hideFullNameForm="showFullNameForm = false" />
    <ChangePasswordForm :show="showPasswordForm" @hidePasswordForm="showPasswordForm = false" />
    <PrimaryDialog :value="showExportDataNotice" title="Data export started">
      <p>You'll receive an email with your information when it's done.</p>
      <div slot="actions" style="text-align: right;">
        <KButton
          primary
          text="Okay"
          @click="showExportDataNotice = !showExportDataNotice"
        />
      </div>
    </PrimaryDialog>

    <PrimaryDialog :value="showDeleteConfirmation" title="Data export started">
      <p>Are you sure you want to permanently delete your account? This cannot be undone.</p>
      <p>Enter your email address to continue</p>
      <KTextbox v-model="accountDeletionEmail" label="Email address" :invalid="deletionEmailIsInvalid" />
      <div slot="actions" style="text-align: right;">
        <KButton
          primary
          text="Okay"
          @click="deleteAccount"
        />
      </div>
    </PrimaryDialog>
  </div>

</template>


<script>

import { mapGetters } from 'vuex';
import client from '../../../shared/client';
import CopyToken from '../../../shared/views/CopyToken';
import PrimaryDialog from '../../../shared/views/PrimaryDialog';
import FullNameForm from './FullNameForm';
import ChangePasswordForm from './ChangePasswordForm';


export default {
  name: "Account",
  components: { ChangePasswordForm, CopyToken, FullNameForm, PrimaryDialog },
  data() {
    return {
      showFullNameForm: false,
      showPasswordForm: false,
      showExportDataNotice: false,
      showDeleteConfirmation: false,
      deletionEmailIsInvalid: false,
      accountDeletionEmail: '',
    }
  },
  computed: {
    ...mapGetters(['channelsAsSoleEditor']),
    fullName() {
      return `${this.$store.state.session.currentUser.first_name} ${this.$store.state.session.currentUser.last_name}`
    }
  },
  methods: {
    startDataExport() {
      const email = this.$store.state.session.currentUser.email;
      client.post(window.Urls.export_user_data(email))
        .then(() => this.showExportDataNotice = true)
        .catch(e => window.alert(`Could not start data export ${e}`))
    },
    deleteAccount() {
      const email = this.$store.state.session.currentUser.email;
      if(email === this.accountDeletionEmail) {
        client.post(window.Urls.delete_user_account(email))
        .then(() => window.location = "/")
        .catch(() => window.alert("Failed to delete your account. Please contact us here: https://community.learningequality.org."));
      } else {
        this.deletionEmailIsInvalid = true;
      }
    }
  }
}

</script>

<style scoped>

.heading {
  margin-top: 24px;
  margin-bottom: 8px;
}

.copy-token {
  height: 36px;
  max-width: 50%;
}

</style>
