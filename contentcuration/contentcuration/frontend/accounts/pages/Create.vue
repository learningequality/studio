<template>

  <ImmersiveModalLayout
    :previousPage="{ name: 'Main' }"
    :appBarText="$tr('backToLoginButton')"
    backButton
  >
    <VImg
      height="200"
      maxHeight="100"
      contain
      :lazy-src="require('shared/images/kolibri-logo.svg')"
      :src="require('shared/images/kolibri-logo.svg')"
    />
    <h2 class="text-xs-center mb-4 primary--text">
      {{ $tr('createAnAccountTitle') }}
    </h2>
    <VAlert type="error" icon="error" :value="!valid" outline>
      {{ $tr('errorsMessage') }}
    </VAlert>
    <VLayout justify-center class="px-4">

      <VForm ref="form" v-model="valid" lazy-validation @submit.prevent="submit">

        <!-- Basic information -->
        <h1 class="font-weight-bold subheading my-2">
          {{ $tr('basicInformationHeader') }}
        </h1>
        <TextField
          v-model="form.firstName"
          :label="$tr('firstNameLabel')"
          autofocus
        />
        <TextField
          v-model="form.lastName"
          :label="$tr('lastNameLabel')"
        />
        <EmailField v-model="form.email" checkExists />
        <PasswordField
          v-model="form.password"
          :label="$tr('passwordLabel')"
        />
        <PasswordField
          v-model="form.passwordConfirm"
          :additionalRules="passwordConfirmRules"
          :label="$tr('confirmPasswordLabel')"
        />

        <!-- Usage -->
        <VInput required :rules="usageRules" class="mt-2" />
        <h1 class="font-weight-bold subheading mb-2">
          {{ $tr('usageLabel') }}*
        </h1>
        <div v-for="option in usageOptions" :key="option.id">
          <VCheckbox
            v-model="form.use"
            :label="option.label"
            :value="option.id"
            hide-details
            color="primary"
          />
          <TextArea
            v-if="showStorageField(option.id)"
            v-model="form.storage"
            :label="$tr('storingUsagePlaceholder')"
            :placeholder="$tr('storingUsageExample')"
            class="ml-4 my-1"
          />
          <TextArea
            v-else-if="option.id === uses.OTHER"
            v-model="form.other_use"
            :label="$tr('otherUsagePlaceholder')"
            class="ml-4 my-2"
          />
        </div>


        <!-- Location -->
        <VInput required :rules="locationRules" class="mt-2" />
        <h1 class="font-weight-bold subheading my-2">
          {{ $tr('locationLabel') }}*
        </h1>
        <CountryField v-model="form.location" />

        <!-- Source -->
        <VInput required :rules="sourceRules" class="mt-2" />
        <h1 class="font-weight-bold subheading my-2">
          {{ $tr('sourceLabel') }}*
        </h1>
        <VSelect
          v-model="form.source"
          :items="sourceOptions"
          item-text="label"
          item-value="id"
          outline
          :label="$tr('sourcePlaceholder')"
        />
        <TextArea
          v-if="form.source === sources.ORGANIZATION"
          v-model="form.organization"
          :label="$tr('organizationSourcePlaceholder')"
        />
        <TextArea
          v-else-if="form.source === sources.CONFERENCE"
          v-model="form.conference"
          :label="$tr('conferenceSourcePlaceholder')"
        />
        <TextArea
          v-else-if="form.source === sources.OTHER"
          v-model="form.other_source"
          :label="$tr('otherSourcePlaceholder')"
        />

        <!-- Policy -->
        <ActionLink
          class="mt-4"
          :text="$tr('viewPrivacyPolicyLink')"
          @click="showPolicies = true"
        />
        <VDialog v-model="showPolicies" width="500">
          <VCard>
            <VCardTitle class="headline grey lighten-4" primary-title>
              {{ $tr('privacyPolicyTitle') }}
            </VCardTitle>
            <iframe :src="policyLink"></iframe>
            <VDivider />
            <VCardActions>
              <VSpacer />
              <VBtn color="primary" flat @click="showPolicies = false">
                {{ $tr('closeButton') }}
              </VBtn>
            </VCardActions>
          </VCard>
        </VDialog>
        <VCheckbox
          v-model="form.accepted_policy"
          :label="$tr('privacyPolicyCheck')"
          color="primary"
          required
          :rules="policyRules"
          class="mt-1 mb-3 policy-checkbox"
        />

        <p class="mb-4">
          {{ $tr('contactMessage') }}
        </p>
        <VBtn color="primary" large type="submit">
          {{ $tr('finishButton') }}
        </VBtn>
      </VForm>

    </VLayout>
  </ImmersiveModalLayout>

</template>


<script>

  import { uses, sources } from '../constants';
  import TextField from '../components/TextField';
  import EmailField from '../components/EmailField';
  import PasswordField from '../components/PasswordField';
  import TextArea from '../components/TextArea';
  import ActionLink from 'shared/views/ActionLink';
  import CountryField from 'shared/views/form/CountryField';
  import ImmersiveModalLayout from 'shared/layouts/ImmersiveModalLayout';

  export default {
    name: 'Create',
    components: {
      ImmersiveModalLayout,
      ActionLink,
      TextField,
      EmailField,
      PasswordField,
      TextArea,
      CountryField,
    },
    data() {
      return {
        valid: true,
        showPolicies: false,
        form: {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          passwordConfirm: '',
          use: [],
          storage: '',
          other_use: '',
          location: [],
          source: '',
          organization: '',
          conference: '',
          other_source: '',
          accepted_policy: false,
        },
      };
    },
    computed: {
      passwordConfirmRules() {
        return [v => this.form.password === v || this.$tr('passwordMatchMessage')];
      },
      policyRules() {
        return [v => !!v || this.$tr('privacyPolicyRequiredMessage')];
      },
      uses() {
        return uses;
      },
      usageOptions() {
        return [
          {
            id: uses.ORGANIZING,
            label: this.$tr('organizingUsageOption'),
          },
          {
            id: uses.FINDING,
            label: this.$tr('findingUsageOption'),
          },
          {
            id: uses.SEQUENCING,
            label: this.$tr('sequencingUsageOption'),
          },
          {
            id: uses.CREATING_EXERCISES,
            label: this.$tr('creatingExercisesUsageOption'),
          },
          {
            id: uses.SHARING,
            label: this.$tr('sharingUsageOption'),
          },
          {
            id: uses.STORING,
            label: this.$tr('storingUsageOption'),
          },
          {
            id: uses.TAGGING,
            label: this.$tr('taggingUsageOption'),
          },
          {
            id: uses.OTHER,
            label: this.$tr('otherUsageOption'),
          },
        ];
      },
      usageRules() {
        return [() => !!this.form.use.length || this.$tr('fieldRequiredMessage')];
      },
      locationRules() {
        return [() => !!this.form.location.length || this.$tr('fieldRequiredMessage')];
      },
      sources() {
        return sources;
      },
      sourceOptions() {
        return [
          {
            id: sources.ORGANIZATION,
            label: this.$tr('organizationSourceOption'),
            additional: {
              model: this.form.organization,
              label: this.$tr('organizationSourcePlaceholder'),
            },
          },
          {
            id: sources.WEBSITE,
            label: this.$tr('websiteSourceOption'),
          },
          {
            id: sources.NEWSLETTER,
            label: this.$tr('newsletterSourceOption'),
          },
          {
            id: sources.FORUM,
            label: this.$tr('forumSourceOption'),
          },
          {
            id: sources.GITHUB,
            label: this.$tr('githubSourceOption'),
          },
          {
            id: sources.SOCIAL_MEDIA,
            label: this.$tr('socialMediaSourceOption'),
          },
          {
            id: sources.CONFERENCE,
            label: this.$tr('conferenceSourceOption'),
            additional: {
              model: this.form.conference,
              label: this.$tr('conferenceSourcePlaceholder'),
            },
          },
          {
            id: sources.CONVERSATION,
            label: this.$tr('conversationSourceOption'),
          },
          {
            id: sources.DEMO,
            label: this.$tr('personalDemoSourceOption'),
          },
          {
            id: sources.OTHER,
            label: this.$tr('otherSourceOption'),
            additional: {
              model: this.form.other_source,
              label: this.$tr('otherSourcePlaceholder'),
            },
          },
        ];
      },
      sourceRules() {
        return [() => !!this.form.source.length || this.$tr('fieldRequiredMessage')];
      },
      policyLink() {
        let path = this.$router.resolve({ name: 'Policy' });
        return `${window.Urls.policies()}${path.href}`;
      },
    },
    methods: {
      showStorageField(id) {
        return id === uses.STORING && this.form.use.includes(id);
      },
      submit() {
        if (this.$refs.form.validate()) {
          // handle account creation
          this.$router.push({ name: 'ActivationSent' });
        }
      },
    },
    $trs: {
      backToLoginButton: 'Sign in',
      createAnAccountTitle: 'Create an account',
      fieldRequiredMessage: 'Field is required',
      errorsMessage: 'Please fix the errors below',

      // Basic information strings
      basicInformationHeader: 'Basic information',
      firstNameLabel: 'First name',
      lastNameLabel: 'Last name',
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Confirm password',
      passwordMatchMessage: "Passwords don't match",

      // Usage question
      usageLabel: 'How do you plan on using Kolibri Studio (check all that apply)',
      organizingUsageOption: 'Organizing or aligning existing materials',
      findingUsageOption: 'Finding and adding additional content sources',
      sequencingUsageOption: 'Sequencing materials using prerequisites',
      creatingExercisesUsageOption: 'Creating exercises',
      sharingUsageOption: 'Sharing materials publicly',
      storingUsageOption: 'Storing materials for private or local use',
      storingUsagePlaceholder: 'How much storage do you need?',
      storingUsageExample: 'e.g. 500MB',
      taggingUsageOption: 'Tagging content sources for discovery',
      otherUsageOption: 'Other',
      otherUsagePlaceholder: 'Other reasons',

      // Location question
      locationLabel: 'Where do you plan to use Kolibri Studio? (check all that apply)',

      // Introduction question
      sourceLabel: 'How did you hear about us?',
      sourcePlaceholder: 'Select one',
      organizationSourceOption: 'Organization',
      organizationSourcePlaceholder: 'Name of organization',
      websiteSourceOption: 'Learning Equality website',
      newsletterSourceOption: 'Learning Equality newsletter',
      forumSourceOption: 'Learning Equality community forum',
      githubSourceOption: 'Learning Equality GitHub',
      socialMediaSourceOption: 'Social media',
      conferenceSourceOption: 'Conference',
      conferenceSourcePlaceholder: 'Name of conference',
      conversationSourceOption: 'Conversation with Learning Equality',
      personalDemoSourceOption: 'Personal demo',
      otherSourceOption: 'Other',
      otherSourcePlaceholder: 'Please describe',

      // Privacy policy
      viewPrivacyPolicyLink: 'View privacy policy',
      privacyPolicyTitle: 'Privacy policy',
      privacyPolicyCheck: 'I have read and agree to the privacy policy',
      privacyPolicyRequiredMessage: 'Please accept our privacy policy',
      contactMessage: 'Questions or concerns? Please email us at content@learningequality.org',

      closeButton: 'Close',
      finishButton: 'Finish',
    },
  };

</script>


<style lang="less" scoped>

  .v-text-field,
  .v-textarea {
    max-width: 350px;
  }

  .v-text-field {
    margin-top: 8px !important;
  }

  .policy-checkbox /deep/ .v-input__slot {
    margin-bottom: 4px !important;
    label {
      color: var(--v-grey-darken1) !important;
    }
  }

  iframe {
    width: 100%;
    min-height: 400px;
    padding: 8px;
    padding-right: 0;
    border: 0;
  }

</style>
