<template>

  <StudioImmersiveModal
    :value="true"
    @input="goBack"
  >
    <template #header>
      {{ $tr('createAnAccountTitle') }}
    </template>
    <div class="logo-container">
      <KLogo
        altText="Kolibri Logo with background"
        :showBackground="true"
        :size="120"
      />
    </div>
    <h1
      ref="top"
      class="page-title"
    >
      {{ $tr('createAnAccountTitle') }}
    </h1>
    <div class="form-container">
      <form
        ref="form"
        @submit.prevent="submit"
      >
        <StudioBanner
          v-if="!valid"
          error
          class="banner"
        >
          {{ registrationFailed ? $tr('registrationFailed') : $tr('errorsMessage') }}
        </StudioBanner>
        <StudioBanner
          v-if="offline"
          error
          class="banner"
        >
          {{ $tr('registrationFailedOffline') }}
        </StudioBanner>
        <!-- Basic information -->
        <h2 class="section-header">
          {{ $tr('basicInformationHeader') }}
        </h2>
        <KTextbox
          v-model="form.first_name"
          :maxlength="100"
          :autofocus="true"
          :label="$tr('firstNameLabel')"
          :invalid="Boolean(errors.first_name.length)"
          :invalidText="errors.first_name.length ? errors.first_name[0] : ''"
          :showInvalidText="true"
          @input="resetErrors('first_name')"
          @blur="validateField('first_name')"
        />
        <KTextbox
          v-model="form.last_name"
          :maxlength="100"
          :label="$tr('lastNameLabel')"
          :invalid="Boolean(errors.last_name.length)"
          :invalidText="errors.last_name.length ? errors.last_name[0] : ''"
          :showInvalidText="true"
          @input="resetErrors('last_name')"
          @blur="validateField('last_name')"
        />
        <StudioEmailField
          v-model="form.email"
          :maxlength="100"
          :disabled="Boolean($route.query.email)"
          :errorMessages="errors.email"
          @input="resetErrors('email')"
          @blur="validateField('email')"
        />
        <StudioPasswordField
          v-model="form.password1"
          :label="$tr('passwordLabel')"
          :errorMessages="errors.password1"
          @input="resetErrors('password1')"
          @blur="validateField('password1')"
        />
        <StudioPasswordField
          v-model="form.password2"
          :label="$tr('confirmPasswordLabel')"
          :errorMessages="errors.password2"
          @input="resetErrors('password2')"
          @blur="validateField('password2')"
        />

        <!-- Usage -->
        <h2 class="section-header">{{ $tr('usageLabel') }}*</h2>
        <div
          v-for="option in usageOptions"
          :key="option.id"
        >
          <KCheckbox
            :checked="form.uses.includes(option.id)"
            :label="option.label"
            @change="toggleUsage(option.id)"
          />
          <KTransition kind="component-vertical-slide-out-in">
            <KTextbox
              v-if="showStorageField(option.id)"
              key="storage-field"
              v-model="form.storage"
              :label="$tr('storingUsagePlaceholder')"
              :placeholder="$tr('storingUsageExample')"
              class="conditional-field"
            />
          </KTransition>
          <KTransition kind="component-vertical-slide-out-in">
            <KTextbox
              v-if="showOtherField(option.id)"
              key="other-use-field"
              v-model="form.other_use"
              :label="$tr('otherUsagePlaceholder')"
              :textArea="true"
              :maxlength="500"
              :invalid="Boolean(errors.other_use.length)"
              :invalidText="errors.other_use.length ? errors.other_use[0] : ''"
              :showInvalidText="true"
              class="conditional-field-textarea"
              @blur="validateField('other_use')"
            />
          </KTransition>
        </div>
        <div
          v-if="!valid && (!form.uses || !form.uses.length)"
          class="field-error"
        >
          {{ $tr('fieldRequired') }}
        </div>

        <!-- Location -->
        <h2 class="section-header">{{ $tr('locationLabel') }}*</h2>
        <CountryField
          v-model="form.locations"
          clearable
        />
        <div
          v-if="!valid && (!form.locations || !form.locations.length)"
          class="field-error"
        >
          {{ $tr('fieldRequired') }}
        </div>

        <!-- Source -->
        <h2 class="section-header">{{ $tr('sourceLabel') }}*</h2>
        <KSelect
          v-model="form.source"
          :options="sourceOptions"
          :placeholder="$tr('sourcePlaceholder')"
        />
        <KTransition kind="component-vertical-slide-out-in">
          <KTextbox
            v-if="form.source && form.source.value === sources.ORGANIZATION"
            key="organization-source"
            v-model="form.organization"
            :label="$tr('organizationSourcePlaceholder')"
            :textArea="true"
          />
          <KTextbox
            v-else-if="form.source && form.source.value === sources.CONFERENCE"
            key="conference-source"
            v-model="form.conference"
            :label="$tr('conferenceSourcePlaceholder')"
            :textArea="true"
          />
          <KTextbox
            v-else-if="form.source && form.source.value === sources.OTHER"
            key="other-source"
            v-model="form.other_source"
            :label="$tr('otherSourcePlaceholder')"
            :textArea="true"
          />
        </KTransition>
        <div
          v-if="!valid && (!form.source || !form.source.value)"
          class="field-error"
        >
          {{ $tr('fieldRequired') }}
        </div>

        <!-- Agreements -->
        <KCheckbox
          :checked="acceptedAgreement"
          :label="$tr('agreement')"
          class="policy-checkbox"
          @change="acceptedAgreement = $event"
        />
        <!-- Error message for Agreements -->
        <KTransition kind="component-vertical-slide-out-in">
          <div
            v-if="!acceptedAgreement"
            key="agreement-error"
            class="policy-error"
          >
            {{ $tr('ToSRequiredMessage') }}
          </div>
        </KTransition>

        <div class="span-spacing">
          <span>
            <KRouterLink
              :to="{ query: { showPolicy: policies.PRIVACY } }"
              :text="$tr('viewPrivacyPolicyLink')"
            />
          </span>
          <span> | </span>
          <span>
            <KRouterLink
              :to="{ query: { showPolicy: policies.TERMS_OF_SERVICE } }"
              :text="$tr('viewToSLink')"
            />
          </span>
        </div>

        <div class="contact-message">
          {{ $tr('contactMessage') }}
        </div>

        <KButton
          primary
          class="submit-button"
          :disabled="offline || submitting"
          :text="$tr('finishButton')"
          type="submit"
          data-test="submit-button"
        />
      </form>
    </div>
    <PolicyModals />
  </StudioImmersiveModal>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import KTextbox from 'kolibri-design-system/lib/KTextbox';
  import KCheckbox from 'kolibri-design-system/lib/KCheckbox';
  import KTransition from 'kolibri-design-system/lib/KTransition';
  import KSelect from 'kolibri-design-system/lib/KSelect';
  import KRouterLink from 'kolibri-design-system/lib/buttons-and-links/KRouterLink';
  import { uses, sources } from '../constants';
  import StudioEmailField from '../components/form/StudioEmailField';
  import StudioPasswordField from '../components/form/StudioPasswordField';
  import CountryField from 'shared/views/form/CountryField';
  import PolicyModals from 'shared/views/policies/PolicyModals';
  import StudioImmersiveModal from 'shared/views/StudioImmersiveModal';
  import StudioBanner from 'shared/views/StudioBanner';
  import { policies } from 'shared/constants';
  import commonStrings from 'shared/translator';

  export default {
    name: 'Create',
    components: {
      StudioImmersiveModal,
      KTextbox,
      KCheckbox,
      KTransition,
      KSelect,
      StudioEmailField,
      StudioPasswordField,
      CountryField,
      PolicyModals,
      StudioBanner,
      KRouterLink,
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
          source: {},
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
          other_use: [],
          password2: [],
        },
      };
    },
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
      ...mapGetters('policies', ['getPolicyAcceptedData']),
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
      sources() {
        return sources;
      },
      policies() {
        return policies;
      },
      sourceOptions() {
        return [
          {
            value: sources.ORGANIZATION,
            label: this.$tr('organizationSourceOption'),
          },
          {
            value: sources.WEBSITE,
            label: this.$tr('websiteSourceOption'),
          },
          {
            value: sources.NEWSLETTER,
            label: this.$tr('newsletterSourceOption'),
          },
          {
            value: sources.FORUM,
            label: this.$tr('forumSourceOption'),
          },
          {
            value: sources.GITHUB,
            label: this.$tr('githubSourceOption'),
          },
          {
            value: sources.SOCIAL_MEDIA,
            label: this.$tr('socialMediaSourceOption'),
          },
          {
            value: sources.CONFERENCE,
            label: this.$tr('conferenceSourceOption'),
          },
          {
            value: sources.CONVERSATION,
            label: this.$tr('conversationSourceOption'),
          },
          {
            value: sources.DEMO,
            label: this.$tr('personalDemoSourceOption'),
          },
          {
            value: sources.OTHER,
            label: this.$tr('otherSourceOption'),
          },
        ];
      },
      clean() {
        return data => {
          const cleanedData = { ...data, policies: {} };
          Object.keys(cleanedData).forEach(key => {
            if (key === 'source') {
              const sourceValue =
                cleanedData[key] && cleanedData[key].value != null
                  ? cleanedData[key].value
                  : cleanedData[key] || '';
              if (sourceValue === sources.ORGANIZATION) {
                cleanedData[key] = `${cleanedData.organization} (organization)`;
              } else if (sourceValue === sources.CONFERENCE) {
                cleanedData[key] = `${cleanedData.conference} (conference)`;
              } else if (sourceValue === sources.OTHER) {
                cleanedData[key] = `${cleanedData.other_source} (other)`;
              } else {
                cleanedData[key] = sourceValue.trim();
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
      goBack() {
        this.$router.push({ name: 'Main' });
      },
      toggleUsage(id) {
        const index = this.form.uses.indexOf(id);
        if (index > -1) {
          this.form.uses.splice(index, 1);
        } else {
          this.form.uses.push(id);
        }
      },
      showStorageField(id) {
        return id === uses.STORING && this.form.uses.includes(id);
      },
      showOtherField(id) {
        return id === uses.OTHER && this.form.uses.includes(id);
      },
      validateField(field) {
        switch (field) {
          case 'first_name':
            if (!this.form.first_name || this.form.first_name.trim() === '') {
              /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
              this.errors.first_name = [commonStrings.$tr('fieldRequired')];
            } else {
              this.errors.first_name = [];
            }
            break;
          case 'last_name':
            if (!this.form.last_name || this.form.last_name.trim() === '') {
              /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
              this.errors.last_name = [commonStrings.$tr('fieldRequired')];
            } else {
              this.errors.last_name = [];
            }
            break;
          case 'email':
            if (!this.form.email || this.form.email.trim() === '') {
              /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
              this.errors.email = [commonStrings.$tr('fieldRequired')];
            } else if (!/\S+@\S+\.\S+/.test(this.form.email)) {
              this.errors.email = [this.$tr('emailValidationMessage')];
            } else {
              this.errors.email = [];
            }
            break;
          case 'password1':
            if (!this.form.password1) {
              /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
              this.errors.password1 = [commonStrings.$tr('fieldRequired')];
            } else if (this.form.password1.length < 8) {
              this.errors.password1 = [this.$tr('passwordValidationMessage')];
            } else {
              this.errors.password1 = [];
            }
            break;
          case 'password2':
            if (!this.form.password2) {
              /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
              this.errors.password2 = [commonStrings.$tr('fieldRequired')];
            } else if (this.form.password1 !== this.form.password2) {
              this.errors.password2 = [this.$tr('passwordMatchMessage')];
            } else {
              this.errors.password2 = [];
            }
            break;
          case 'other_use':
            if (
              this.form.uses.includes(uses.OTHER) &&
              (!this.form.other_use || this.form.other_use.trim() === '')
            ) {
              /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
              this.errors.other_use = [commonStrings.$tr('fieldRequired')];
            } else {
              this.errors.other_use = [];
            }
            break;
        }
      },
      validateForm() {
        let isValid = true;

        ['first_name', 'last_name', 'email', 'password1', 'password2', 'other_use'].forEach(
          field => {
            this.validateField(field);
            if (this.errors[field].length > 0) {
              isValid = false;
            }
          },
        );

        if (!this.form.uses || this.form.uses.length === 0) {
          isValid = false;
        }
        if (!this.form.locations || this.form.locations.length === 0) {
          isValid = false;
        }
        if (!this.form.source || !this.form.source.value) {
          isValid = false;
        }

        this.valid = isValid;
        return isValid;
      },
      submit() {
        // We need to check the "acceptedAgreement" here explicitly because it is not a
        // Vuetify form field and does not trigger the form validation.
        if (this.validateForm() && this.acceptedAgreement) {
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
      emailValidationMessage: 'Please enter a valid email address',
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
      fieldRequired: 'Field is required',
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

  .logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .page-title {
    margin-bottom: 32px;
    font-size: 24px;
    text-align: center;
  }

  .form-container {
    display: flex;
    justify-content: center;
    padding: 0 24px;
  }

  form {
    width: 100%;
    max-width: 600px;
  }

  .banner {
    margin-bottom: 32px;
  }

  .section-header {
    margin-top: 16px;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: bold;
  }

  .conditional-field {
    margin-top: 8px;
    margin-bottom: 8px;
    margin-left: 32px;
  }

  .conditional-field-textarea {
    margin-top: 16px;
    margin-bottom: 16px;
    margin-left: 32px;
  }

  .field-error {
    min-height: 0;
    margin-top: 4px;
    margin-bottom: 8px;
    font-size: 12px;
    color: #b00020;
  }

  .policy-checkbox {
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .policy-error {
    min-height: 0;
    margin-bottom: 4px;
    margin-left: 40px;
    font-size: 12px;
    color: #b00020;
  }

  .span-spacing {
    display: flex;
    margin-left: 40px;

    span {
      margin-left: 2px;
      font-size: 16px;
    }
  }

  .contact-message {
    margin-top: 16px;
    margin-left: 40px;
  }

  .submit-button {
    margin-top: 40px;
  }

</style>
