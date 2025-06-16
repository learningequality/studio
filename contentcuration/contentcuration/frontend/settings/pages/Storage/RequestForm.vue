<template>

  <form
    ref="form"
    @submit.prevent="submit"
  >
    <Banner
      :value="Boolean(errorCount())"
      error
      :text="errorText()"
      class="my-2"
    />

    <!-- Nature of content -->
    <h3>{{ $tr('natureOfYourContentLabel') }}</h3>
    <KTextbox
      v-model="storage"
      :label="$tr('storageAmountRequestedPlaceholder')"
      :invalid="errors.storage"
      :showInvalidText="errors.storage"
      :invalidText="$tr('fieldRequiredText')"
    />
    <KTextbox
      v-model="resource_count"
      :invalid="errors.resource_count"
      :showInvalidText="errors.resource_count"
      :invalidText="$tr('fieldRequiredText')"
      :label="$tr('approximatelyHowManyResourcesLabel')"
      :placeholder="$tr('numberOfResourcesPlaceholder')"
      :floatingLabel="false"
    />
    <KTextbox
      v-model="resource_size"
      :label="$tr('averageSizeOfResourceLabel')"
      :placeholder="$tr('sizePlaceholder')"
      :floatingLabel="false"
    />
    <KTextbox
      v-model="kind"
      :invalid="errors.kind"
      :showInvalidText="errors.kind"
      :invalidText="$tr('fieldRequiredText')"
      :label="$tr('kindOfContentQuestionLabel')"
      :placeholder="$tr('typeOfContentPlaceholder')"
      :floatingLabel="false"
      :textArea="true"
    />
    <KTextbox
      v-model="creators"
      :label="$tr('authorLabel')"
      :placeholder="$tr('responsePlaceholder')"
      :floatingLabel="false"
      :textArea="true"
    />
    <KTextbox
      v-model="sample_link"
      :invalid="errors.sample_link"
      :showInvalidText="errors.sample_link"
      :invalidText="$tr('fieldRequiredText')"
      :label="$tr('provideSampleLinkLabel')"
      :placeholder="$tr('pasteLinkPlaceholder')"
      :floatingLabel="false"
    />

    <!-- Who can use content -->
    <h3>
      {{ $tr('whoCanUseContentLabel') }}
      <InfoModal
        :header="$tr('licenseInfoHeader')"
        :items="licenseOptions"
      >
        <template #header="{ item }">
          {{ translateConstant(item.license_name) }}
        </template>
        <template #description="{ item }">
          {{ translateConstant(`${item.license_name}_description`) }}
          <p
            v-if="item.license_url"
            class="mt-1"
          >
            <KExternalLink
              class="license-link"
              :href="getLicenseUrl(item)"
              :text="$tr('learnMoreButton')"
              openInNewTab
            />
          </p>
        </template>
      </InfoModal>
    </h3>
    <div class="mt-2">
      <div
        v-if="errors.license"
        style="color: red"
      >
        {{ $tr('fieldRequiredText') }}
      </div>
      <label>{{ $tr('licensingQuestionLabel') }}</label>
    </div>
    <KCheckbox
      v-for="option in licenseOptions"
      :key="option.license_name"
      :label="translateConstant(option.license_name)"
      :checked="license.includes(option.license_name)"
      @change="toggleLicense(option.license_name)"
    />

    <div class="mb-1 mt-3">
      <label>{{ $tr('willYouMakeYourChannelPublicLabel') }}</label>
    </div>
    <MultiSelect
      v-model="publicChannels"
      :label="$tr('selectAllThatApplyPlaceholder')"
      :items="publicChannelOptions"
      :item-value="channelName"
      item-text="name"
      notranslate
      :box="false"
    />

    <!-- How are you using your content -->
    <h3>{{ $tr('howAreYouUsingYourContentLabel') }}</h3>
    <KTextbox
      v-model="audience"
      :invalid="errors.audience"
      :showInvalidText="errors.audience"
      :invalidText="$tr('fieldRequiredText')"
      :label="$tr('intendedAudienceLabel')"
      :placeholder="$tr('audiencePlaceholder')"
      textArea
    />
    <div class="mb-1 mt-3">
      <label>{{ $tr('targetRegionsLabel') }}</label>
    </div>
    <CountryField
      v-model="location"
      :box="false"
      :menu-props="{ zIndex: 1, offsetY: true }"
    />
    <KTextbox
      v-model="import_count"
      :invalid="errors.import_count"
      :showInvalidText="errors.import_count"
      :invalidText="$tr('fieldRequiredText')"
      :label="$tr('howOftenImportedToKolibriLabel')"
      :placeholder="$tr('storageAmountRequestedPlaceholder')"
      :floatingLabel="false"
    />

    <h3>{{ $tr('usageLabel') }}</h3>
    <div class="mt-2">
      <div
        v-if="errors.org_or_personal"
        style="color: red"
      >
        {{ $tr('fieldRequiredText') }}
      </div>
      <label>{{ $tr('organizationalAffiliationLabel') }}</label>
    </div>
    <KRadioButtonGroup>
      <KRadioButton
        v-for="affiliation in affiliationOptions"
        :key="affiliation.value"
        v-model="org_or_personal"
        :buttonValue="affiliation.value"
        :invalid="errors.org_or_personal"
        :showInvalidText="errors.org_or_personal"
        :invalidText="$tr('fieldRequiredText')"
        :label="affiliation.text"
      />
    </KRadioButtonGroup>
    <KTextbox
      v-model="organization"
      :invalid="errors.organization"
      :showInvalidText="errors.organization"
      :invalidText="$tr('fieldRequiredText')"
      label=" "
      :placeholder="$tr('organizationNamePlaceholder')"
      :floatingLabel="false"
      style="margin-left: 36px"
      :disabled="!orgSelected"
    />

    <div class="mb-1 mt-3">
      <div
        v-if="errors.organization_type"
        style="color: red"
      >
        {{ $tr('fieldRequiredText') }}
      </div>
      <label :style="{ color: orgSelected ? 'black' : 'gray' }">
        {{ $tr('typeOfOrganizationLabel') }}
      </label>
    </div>
    <KRadioButtonGroup>
      <KRadioButton
        v-for="orgType in organizationTypeOptions"
        :key="orgType.value"
        v-model="organization_type"
        :buttonValue="orgType.value"
        :invalid="errors.organization_type"
        :showInvalidText="errors.organization_type"
        :invalidText="$tr('fieldRequiredText')"
        :label="orgType.text"
        :disabled="!orgSelected"
      />
    </KRadioButtonGroup>
    <KTextbox
      v-model="organization_other"
      :invalid="errors.organization_other"
      :showInvalidText="errors.organization_other"
      :invalidText="$tr('fieldRequiredText')"
      :label="' '"
      :placeholder="$tr('organizationNamePlaceholder')"
      :floatingLabel="false"
      style="margin-left: 36px"
      :disabled="!orgSelected || !orgTypeOtherSelected"
    />

    <!-- Time constraint -->
    <div class="mb-1">
      <label>{{ $tr('timelineLabel') }}</label>
    </div>
    <KRadioButtonGroup>
      <KRadioButton
        v-for="constraint in timeConstraintOptions"
        :key="constraint.value"
        v-model="time_constraint"
        :buttonValue="constraint.value"
        :label="constraint.text"
      />
    </KRadioButtonGroup>

    <!-- Use case -->
    <div class="mb-1 mt-4">
      <label>{{ $tr('explainNeedsInDetailLabel') }}</label>
    </div>
    <KTextbox
      v-model="message"
      :invalid="errors.message"
      :showInvalidText="errors.message"
      :invalidText="$tr('fieldRequiredText')"
      :floatingLabel="false"
      label=" "
      :placeholder="$tr('responsePlaceholder')"
      textArea
    />

    <div class="my-5">
      <KButton
        primary
        :text="$tr('sendRequestAction')"
        @click="submit"
      />
    </div>
  </form>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapActions, mapState } from 'vuex';
  import { generateFormMixin, constantsTranslationMixin } from 'shared/mixins';
  import { LicensesList } from 'shared/leUtils/Licenses';
  import CountryField from 'shared/views/form/CountryField';
  import MultiSelect from 'shared/views/form/MultiSelect';
  import Banner from 'shared/views/Banner';
  import InfoModal from 'shared/views/InfoModal';

  const formMixin = generateFormMixin({
    storage: { required: true },
    kind: { required: true },
    resource_count: { required: true },
    resource_size: { required: false },
    creators: { required: true },
    sample_link: { required: false },
    license: {
      required: true,
      multiSelect: true,
    },
    publicChannels: {
      required: false,
      multiSelect: true,
    },
    audience: { required: true },
    location: {
      required: false,
      multiSelect: true,
    },
    import_count: { required: true },
    org_or_personal: { required: true },
    organization: {
      required: true,
      validator: (value, vm) => {
        return !vm.orgSelected || Boolean(value);
      },
    },
    organization_type: {
      required: true,
      validator(value, vm) {
        return !vm.orgSelected || Boolean(value);
      },
    },
    organization_other: {
      required: true,
      validator(value, vm) {
        return !vm.orgSelected || !vm.orgTypeOtherSelected || Boolean(value);
      },
    },
    time_constraint: { required: false },
    message: { required: true },
  });

  export default {
    name: 'RequestForm',
    components: {
      CountryField,
      MultiSelect,
      Banner,
      InfoModal,
    },
    mixins: [constantsTranslationMixin, formMixin],
    computed: {
      ...mapState('settings', ['channels']),
      orgSelected() {
        return this.org_or_personal === 'Organization';
      },
      orgTypeOtherSelected() {
        return this.organization_type === 'Other';
      },
      licenseOptions() {
        return LicensesList;
      },
      affiliationOptions() {
        return [
          { value: 'Not affiliated', text: this.$tr('notAffiliatedLabel') },
          { value: 'Organization', text: this.$tr('uploadingOnBehalfLabel') },
        ];
      },
      organizationTypeOptions() {
        return [
          { value: 'Grassroots and/or volunteer initiative', text: this.$tr('grassrootsLabel') },
          { value: 'Small NGO with annual budget < $25K', text: this.$tr('smallNgoLabel') },
          { value: 'Medium-sized NGO with budget < $500K', text: this.$tr('mediumNgoLabel') },
          {
            value: 'Larger INGO or other international agency',
            text: this.$tr('largeIntlNgoLabel'),
          },
          { value: 'For-profit or social enterprise company', text: this.$tr('forProfitLabel') },
          { value: 'Other', text: this.$tr('otherLabel') },
        ];
      },
      timeConstraintOptions() {
        return [
          { value: '1 week', text: this.$tr('oneWeekLabel') },
          { value: '2-4 weeks', text: this.$tr('twoToFourWeeksLabel') },
          { value: '1-2 months', text: this.$tr('coupleMonthsLabel') },
          { value: '3-6 months', text: this.$tr('threeToSixMonthsLabel') },
          { value: '6+ months', text: this.$tr('sixPlusMonthsLabel') },
          { value: 'Unknown', text: this.$tr('unknownLabel') },
        ];
      },
      publicChannelOptions() {
        return sortBy(this.channels, c => c.name.toLowerCase()).filter(c => !c.public);
      },
    },
    methods: {
      ...mapActions('settings', ['requestStorage']),
      getLicenseUrl(item) {
        const isCC = item.license_url.includes('creativecommons.org');
        const language = window.languageCode || 'en';
        return isCC ? `${item.license_url}deed.${language}` : item.license_url;
      },
      toggleLicense(license) {
        if (this.license.includes(license)) {
          this.license = this.license.filter(l => l !== license);
        } else {
          // Vue doesn't register push, so use explicit assignment
          this.license = this.license.concat([license]);
        }
      },
      channelName(channel) {
        return `${channel.name} (${channel.id})`;
      },
      // eslint-disable-next-line kolibri/vue-no-unused-methods, vue/no-unused-properties
      onValidationFailed() {
        // Scroll to error banner
        if (this.$refs.form.scrollIntoView) {
          this.$refs.form.scrollIntoView({ behavior: 'smooth' });
        }
      },

      // eslint-disable-next-line kolibri/vue-no-unused-methods, vue/no-unused-properties
      onSubmit(formData) {
        // Convert list-based fields to comma-separated string
        // Can use commas as storage email needs to be in English
        formData.license = formData.license.join(', ');
        formData.public = formData.publicChannels.join(', ');
        formData.location = formData.location.join(', ');

        // Parse organization-related strings
        // Leave untranslated so request will be in English
        formData.organization_type = 'Not applicable';
        if (this.orgSelected) {
          formData.organization_type = this.orgTypeOtherSelected
            ? this.organization_other
            : this.organization_type;
        }
        formData.uploading_for = this.orgSelected
          ? `${this.organization} (organization)`
          : this.org_or_personal;

        // Send request
        this.requestStorage(formData)
          .then(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('requestSent') });
            this.reset();
            this.$emit('submitted');
          })
          .catch(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('requestFailed') });
          });
      },
    },
    $trs: {
      /* Nature of your content */
      natureOfYourContentLabel: 'Nature of your content',
      storageAmountRequestedPlaceholder: 'Amount requested (e.g. 10GB)',
      approximatelyHowManyResourcesLabel:
        'Approximately how many individual resources are you planning to upload?',
      numberOfResourcesPlaceholder: 'Number of resources',
      averageSizeOfResourceLabel: 'Average size of each resource',
      sizePlaceholder: 'Size',
      kindOfContentQuestionLabel: 'What types of resources do you plan to upload? Please specify',
      typeOfContentPlaceholder: 'Types of resources',
      authorLabel:
        'Who is the author (creator), curator (organizer), and/or aggregator (maintainer) of your content? Please specify',
      responsePlaceholder: 'Response',
      provideSampleLinkLabel:
        'Please provide a link to a sample of your content (on Kolibri Studio or from source site)',
      pasteLinkPlaceholder: 'Paste link here',

      /* Who can use your content */
      whoCanUseContentLabel: 'Who can use your content?',
      learnMoreButton: 'Learn More',
      licenseInfoHeader: 'About licenses',
      licensingQuestionLabel:
        'What is the licensing of the content you are uploading? (Check all that apply)',
      willYouMakeYourChannelPublicLabel:
        'If the content is openly licensed, would you be willing to consider making your channels public to other Kolibri users if requested in the future?',
      selectAllThatApplyPlaceholder: 'Select all that apply',

      /* How are you using your content */
      howAreYouUsingYourContentLabel: 'How are you using your content?',
      intendedAudienceLabel:
        'Who is the intended audience for your channel? How big is your audience?',
      audiencePlaceholder: 'In-school learners, adult learners, teachers, etc',
      targetRegionsLabel: 'Target region(s) for your content (if applicable)',
      howOftenImportedToKolibriLabel:
        'How many times will this content be imported from Studio into new Kolibri installations per month, on average?',

      /* Tell us more about your use of Kolibri */
      usageLabel: 'Tell us more about your use of Kolibri',
      organizationalAffiliationLabel: 'Organizational affiliation',
      notAffiliatedLabel: 'I am not affiliated with an organization for this work',
      uploadingOnBehalfLabel: 'I am uploading content on behalf of:',
      organizationNamePlaceholder: 'Organization name',
      typeOfOrganizationLabel:
        'What type of organization or group is coordinating the use of Kolibri (if applicable)?',
      grassrootsLabel: 'Grassroots and/or volunteer initiative',
      smallNgoLabel: 'Small NGO with annual budget < $25k',
      mediumNgoLabel: 'Medium-sized NGO with budget < $500k',
      largeIntlNgoLabel: 'Larger international NGOs or government agencies',
      forProfitLabel: 'For-profit or social enterprise company',
      otherLabel: 'Other',

      /* Time constraints */
      timelineLabel:
        'To better understand the time sensitive nature of your request, please indicate an approximate timeline by when you need this additional storage:',
      oneWeekLabel: '1 week',
      twoToFourWeeksLabel: '2-4 weeks',
      coupleMonthsLabel: '1-2 months',
      threeToSixMonthsLabel: '3-6 months',
      sixPlusMonthsLabel: '6+ months',
      unknownLabel: 'Unknown',

      /* Use case */
      explainNeedsInDetailLabel:
        'Please write a paragraph explaining your needs and use case for Kolibri Studio, and how it will integrate into your programs. Include information about who is curating, deploying, and using the content. Is this work being coordinated by an organization, as part of an educational program? Include justification for the additional space being requested and explanation of the time sensitive nature of your request.',

      /* Other strings */
      fieldRequiredText: 'Field is required',
      sendRequestAction: 'Send request',
      requestSent: 'Your storage request has been submitted for processing.',
      requestFailed: 'Unable to send request. Please try again.',
    },
  };

</script>


<style scoped>

  h3 {
    margin-top: 32px;
    margin-bottom: 8px;
  }

  /* fixes unintended margin caused by KDS styles */
  .license-link ::v-deep span {
    margin-left: 0 !important;
  }

</style>
