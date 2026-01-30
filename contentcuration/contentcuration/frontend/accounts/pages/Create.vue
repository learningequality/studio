<template>

  <ImmersiveModalLayout
    :previousPage="{ name: 'Main' }"
    :appBarText="$tr('backToLoginButton')"
    backButton
  >
    <div class="align-center d-flex justify-center mb-2">
      <KLogo
        altText="Kolibri Logo with background"
        :showBackground="true"
        :size="120"
      />
    </div>
    <h1
      ref="top"
      class="mb-4 primary--text text-xs-center"
    >
      {{ $tr('createAnAccountTitle') }}
    </h1>
    <VLayout
      justify-center
      class="px-3"
    >
      <VForm
        ref="form"
        v-model="valid"
        lazy-validation
        @submit.prevent="submit"
      >
        <Banner
          :value="!valid"
          error
          class="mb-4"
        >
          {{ registrationFailed ? $tr('registrationFailed') : $tr('errorsMessage') }}
        </Banner>
        <Banner
          :value="offline"
          error
          class="mb-4"
        >
          {{ $tr('registrationFailedOffline') }}
        </Banner>
        <!-- Basic information -->
        <h2 class="font-weight-bold my-2 subheading">
          {{ $tr('basicInformationHeader') }}
        </h2>
        <TextField
          v-model="form.first_name"
          maxlength="100"
          counter
          autofocus
          :label="$tr('firstNameLabel')"
          :error-messages="errors.first_name"
          @input="resetErrors('first_name')"
        />
        <TextField
          v-model="form.last_name"
          maxlength="100"
          counter
          :label="$tr('lastNameLabel')"
          :error-messages="errors.last_name"
          @input="resetErrors('last_name')"
        />
        <EmailField
          v-model="form.email"
          maxlength="100"
          counter
          :disabled="Boolean($route.query.email)"
          :error-messages="errors.email"
          @input="resetErrors('email')"
        />
        <PasswordField
          v-model="form.password1"
          :additionalRules="passwordValidationRules"
          :label="$tr('passwordLabel')"
          :error-messages="errors.password1"
          @input="resetErrors('password1')"
        />
        <PasswordField
          v-model="form.password2"
          :additionalRules="passwordConfirmRules"
          :label="$tr('confirmPasswordLabel')"
          :error-messages="errors.password2"
          @input="resetErrors('password2')"
        />

        <!-- Usage -->
        <VInput
          required
          :rules="usageRules"
          class="mt-2"
        />
        <h2 class="font-weight-bold mb-2 subheading">{{ $tr('usageLabel') }}*</h2>
        <div
          v-for="option in usageOptions"
          :key="option.id"
        >
          <Checkbox
            v-model="form.uses"
            :label="option.label"
            :value="option.id"
          />
          <VSlideYTransition>
            <TextField
              v-if="showStorageField(option.id)"
              v-model="form.storage"
              :label="$tr('storingUsagePlaceholder')"
              :placeholder="$tr('storingUsageExample')"
              class="ml-4 my-1"
            />
            <TextArea
              v-else-if="showOtherField(option.id)"
              v-model="form.other_use"
              :label="$tr('otherUsagePlaceholder')"
              class="ml-4 my-2"
            />
          </VSlideYTransition>
        </div>

        <!-- Location -->
        <VInput
          required
          :rules="locationRules"
          class="mt-4"
        />
        <h2 class="font-weight-bold my-2 subheading">{{ $tr('locationLabel') }}*</h2>
        <CountryField
          v-model="form.locations"
          clearable
        />

        <!-- Source -->
        <VInput
          required
          :rules="sourceRules"
          class="mt-2"
        />
        <h2 class="font-weight-bold my-2 subheading">{{ $tr('sourceLabel') }}*</h2>
        <DropdownWrapper>
          <template #default="{ attach, menuProps }">
            <VSelect
              v-model="form.source"
              :items="sourceOptions"
              item-text="label"
              item-value="id"
              box
              :menu-props="menuProps"
              :attach="attach"
              :label="$tr('sourcePlaceholder')"
            />
          </template>
        </DropdownWrapper>
        <VSlideYTransition>
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
        </VSlideYTransition>

        <!-- Agreements -->
        <Checkbox
          v-model="acceptedAgreement"
          :label="$tr('agreement')"
          class="my-1 policy-checkbox"
        />
        <!-- Error message for Agreements -->
        <VSlideYTransition>
          <div
            v-if="!acceptedAgreement"
            class="error--text policy-error theme--light v-messages"
          >
            <div class="v-messages__message">
              {{ $tr('ToSRequiredMessage') }}
            </div>
          </div>
        </VSlideYTransition>

        <div class="span-spacing">
          <span>
            <ActionLink
              :text="$tr('viewPrivacyPolicyLink')"
              @click="showPrivacyPolicy"
            />
          </span>
          <span> | </span>
          <span>
            <ActionLink
              :text="$tr('viewToSLink')"
              @click="showTermsOfService"
            />
          </span>
        </div>

        <div class="mt-2 span-spacing">
          <div class="align-items">
            {{ $tr('contactMessage') }}
          </div>
        </div>

        <KButton
          primary
          class="mt-5"
          :disabled="offline || submitting"
          :text="$tr('finishButton')"
          type="submit"
          data-test="submit-button"
        />
      </VForm>
    </VLayout>
    <PolicyModals />
  </ImmersiveModalLayout>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { uses, sources } from '../constants';
  import TextField from 'shared/views/form/TextField';
  import EmailField from 'shared/views/form/EmailField';
  import PasswordField from 'shared/views/form/PasswordField';
  import TextArea from 'shared/views/form/TextArea';
  import CountryField from 'shared/views/form/CountryField';
  import PolicyModals from 'shared/views/policies/PolicyModals';
  import ImmersiveModalLayout from 'shared/layouts/ImmersiveModalLayout';
  import Banner from 'shared/views/Banner';
  import Checkbox from 'shared/views/form/Checkbox';
  import { policies } from 'shared/constants';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';
  import commonStrings from 'shared/translator';

  export default {
    name: 'Create',
    components: {
      DropdownWrapper,
      ImmersiveModalLayout,
      TextField,
      EmailField,
      PasswordField,
      TextArea,
      CountryField,
      PolicyModals,
      Banner,
      Checkbox,
    },
    data() {
      return {
        valid: true,
        registrationFailed: false,
        submitting: false,
        form: {
          first_name: '',
          last_name: '',
          email: '',
          password1: '',
          password2: '',
          uses: [],
          storage: '',
          other_use: '',
          locations: [],
          source: '',
          organization: '',
          conference: '',
          other_source: '',
          accepted_policy: false,
          accepted_tos: false,
        },
        errors: {
          first_name: [],
          last_name: [],
          email: [],
          password1: [],
          password2: [],
        },
      };
    },
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
      ...mapGetters('policies', ['getPolicyAcceptedData']),
      passwordConfirmRules() {
        return [value => (this.form.password1 === value ? true : this.$tr('passwordMatchMessage'))];
      },
      passwordValidationRules() {
        return [value => (value.length >= 8 ? true : this.$tr('passwordValidationMessage'))];
      },
      acceptedAgreement: {
        get() {
          return this.form.accepted_tos && this.form.accepted_policy;
        },
        set(accepted) {
          this.form.accepted_tos = accepted;
          this.form.accepted_policy = accepted;
        },
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
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        return [() => (this.form.uses.length ? true : commonStrings.$tr('fieldRequired'))];
      },
      locationRules() {
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        return [() => (this.form.locations.length ? true : commonStrings.$tr('fieldRequired'))];
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
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        return [() => (this.form.source.length ? true : commonStrings.$tr('fieldRequired'))];
      },
      clean() {
        return data => {
          const cleanedData = { ...data, policies: {} };
          Object.keys(cleanedData).forEach(key => {
            // Trim text fields
            if (key === 'source') {
              if (cleanedData[key] === sources.ORGANIZATION) {
                cleanedData[key] = `${cleanedData.organization} (organization)`;
              } else if (cleanedData[key] === sources.CONFERENCE) {
                cleanedData[key] = `${cleanedData.conference} (conference)`;
              } else if (cleanedData[key] === sources.OTHER) {
                cleanedData[key] = `${cleanedData.other_source} (other)`;
              } else {
                cleanedData[key] = cleanedData[key].trim();
              }
            } else if (typeof cleanedData[key] === 'string') {
              cleanedData[key] = cleanedData[key].trim();
            } else if (key === 'locations') {
              cleanedData[key] = cleanedData[key].join('|');
            } else if (key === 'uses') {
              cleanedData[key] = cleanedData[key]
                .map(use => {
                  if (use === uses.OTHER) {
                    return `${cleanedData.other_use} (other)`;
                  } else if (use === uses.STORING) {
                    return `storage (${cleanedData.storage})`;
                  }
                  return use;
                })
                .join('|');
            } else if (key === 'accepted_policy') {
              cleanedData.policies = {
                ...cleanedData.policies,
                ...this.getPolicyAcceptedData(policies.PRIVACY),
              };
            } else if (key === 'accepted_tos') {
              cleanedData.policies = {
                ...cleanedData.policies,
                ...this.getPolicyAcceptedData(policies.TERMS_OF_SERVICE),
              };
            }
          });
          cleanedData.policies = JSON.stringify(cleanedData.policies);
          return cleanedData;
        };
      },
    },
    beforeMount() {
      this.form.email = this.$route.query.email || '';
    },
    methods: {
      ...mapActions('account', ['register']),
      showTermsOfService() {
        this.$router.push({ query: { showPolicy: policies.TERMS_OF_SERVICE } });
      },
      showPrivacyPolicy() {
        this.$router.push({ query: { showPolicy: policies.PRIVACY } });
      },
      showStorageField(id) {
        return id === uses.STORING && this.form.uses.includes(id);
      },
      showOtherField(id) {
        return id === uses.OTHER && this.form.uses.includes(id);
      },
      submit() {
        // We need to check the "acceptedAgreement" here explicitly because it is not a
        // Vuetify form field and does not trigger the form validation.
        if (this.$refs.form.validate() && this.acceptedAgreement) {
          // Prevent double submission
          if (this.submitting) {
            return Promise.resolve();
          }

          this.submitting = true;
          const cleanedData = this.clean(this.form);
          return this.register(cleanedData)
            .then(() => {
              this.$router.push({ name: 'ActivationSent' });
            })
            .catch(error => {
              if (error.message === 'Network Error') {
                this.$refs.top.scrollIntoView({ behavior: 'smooth' });
              } else if (error.response.status === 400) {
                for (const field of error.response.data) {
                  if (!Object.prototype.hasOwnProperty.call(this.errors, field)) {
                    continue;
                  }
                  let message = '';
                  switch (field) {
                    case 'password1':
                      message = this.$tr('passwordValidationMessage');
                      break;
                    default:
                      /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
                      message = commonStrings.$tr('fieldHasError');
                      break;
                  }
                  this.errors[field] = [message];
                }
                this.registrationFailed = true;
                this.valid = false;
              } else if (error.response.status === 403) {
                this.errors.email = [this.$tr('emailExistsMessage')];
              } else if (error.response.status === 405) {
                this.$router.push({ name: 'AccountNotActivated' });
              } else {
                this.registrationFailed = true;
                this.valid = false;
              }
            })
            .finally(() => {
              this.submitting = false;
            });
        } else if (this.$refs.top.scrollIntoView) {
          this.$refs.top.scrollIntoView({ behavior: 'smooth' });
        }
        return Promise.resolve();
      },
      resetErrors(field) {
        this.errors[field] = [];
      },
    },

    $trs: {
      backToLoginButton: 'Sign in',
      createAnAccountTitle: 'Create an account',
      errorsMessage: 'Please fix the errors below',
      registrationFailed: 'There was an error registering your account. Please try again',
      registrationFailedOffline:
        'You seem to be offline. Please connect to the internet to create an account.',
      // Basic information strings
      basicInformationHeader: 'Basic information',
      firstNameLabel: 'First name',
      lastNameLabel: 'Last name',
      emailExistsMessage: 'An account with this email already exists',
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Confirm password',
      passwordMatchMessage: "Passwords don't match",
      passwordValidationMessage: 'Password should be at least 8 characters long',

      // Usage question
      usageLabel: 'How do you plan on using Kolibri Studio (check all that apply)',
      organizingUsageOption: 'Organizing or aligning existing materials',
      findingUsageOption: 'Finding and adding additional content sources',
      sequencingUsageOption: 'Using prerequisites to put materials in a sequence',
      creatingExercisesUsageOption: 'Creating exercises',
      sharingUsageOption: 'Sharing materials publicly',
      storingUsageOption: 'Storing materials for private or local use',
      storingUsagePlaceholder: 'How much storage do you need?',
      storingUsageExample: 'e.g. 500MB',
      taggingUsageOption: 'Tagging content sources for discovery',
      otherUsageOption: 'Other',
      otherUsagePlaceholder: 'Please describe',

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

      // Privacy policy + terms of service
      viewToSLink: 'View Terms of Service',
      ToSRequiredMessage: 'Please accept our terms of service and policy',

      viewPrivacyPolicyLink: 'View Privacy Policy',
      contactMessage: 'Questions or concerns? Please email us at content@learningequality.org',
      finishButton: 'Finish',
      agreement: 'I have read and agree to terms of service and the privacy policy',
    },
  };

</script>


<style lang="scss" scoped>

  .v-text-field {
    margin-top: 8px !important;
  }

  .policy-checkbox ::v-deep .v-input__slot {
    margin-bottom: 4px !important;

    label {
      color: var(--v-grey-darken1) !important;
    }
  }

  .policy-error {
    min-height: 0;
    margin-bottom: 4px;
    margin-left: 40px;
  }

  iframe {
    width: 100%;
    min-height: 400px;
    padding: 8px;
    padding-right: 0;
    border: 0;
  }

  .span-spacing {
    display: flex;
    margin-left: 40px;

    span {
      margin-left: 2px;
      font-size: 16px;
    }
  }

  .span-spacing-email {
    margin-left: 3px;
    font-size: 16px;
  }

  .align-items {
    display: block;
  }

  h1 {
    font-size: 21px;
  }

</style>
