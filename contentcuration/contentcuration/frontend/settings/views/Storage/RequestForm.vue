<template>

  <form @submit.prevent="submit">
    <h3>{{ $tr('natureOfYourContentLabel') }}</h3>
    <KTextbox
      :label="$tr('storageAmountRequestedPlaceholder')"
    />
    <KTextbox
      :label="$tr('approximatelyHowManyResourcesLabel')"
      :placeholder="$tr('numberOfResourcesPlaceholder')"
      :floatingLabel="false"
    />
    <KTextbox
      :label="$tr('averageSizeOfResourceLabel')"
      :placeholder="$tr('numberOfResourcesPlaceholder')"
      :floatingLabel="false"
    />
    <KTextbox
      :label="$tr('kindOfContentQuestionLabel')"
      :placeholder="$tr('typeOfContentPlaceholder')"
      :floatingLabel="false"
      :textArea="true"
    />
    <KTextbox
      :label="$tr('authorLabel')"
      :placeholder="$tr('responsePlaceholder')"
      :floatingLabel="false"
      :textArea="true"
    />
    <KTextbox
      :label="$tr('provideSampleLinkLabel')"
      :placeholder="$tr('pasteLinkPlaceholder')"
      :floatingLabel="false"
    />

    <h3>{{ $tr('whoCanUseContentLabel') }}</h3>
    <label>{{ $tr('licensingQuestionLabel') }}</label>
    <KCheckbox
      v-for="licenseType in licenses"
      :key="licenseType"
      :label="translateConstant(licenseType)"
    />

    <!-- TODO: KDropdownMenu is not to be used for this need. -->
    <label>{{ $tr('willYouMakeYourChannelPublicLabel') }}</label>
    <div>
      <KDropdownMenu
        :text="$tr('selectAllThatApplyPlaceholder')"
        :options="['lorem', 'ipsum',]"
      />
    </div>

    <KTextbox
      :label="$tr('howOftenImportedToKolibriLabel')"
      :placeholder="$tr('storageAmountRequestedPlaceholder')"
      :floatingLabel="false"
    />

    <label>{{ $tr('organizationalAffiliationLabel') }}</label>
    <KRadioButton
      :label="$tr('notAffiliatedLabel')"
    />
    <KRadioButton
      :label="$tr('uploadingOnBehalfLabel')"
    />
    <KTextbox
      :label="' '"
      :placeholder="$tr('organizationNamePlaceholder')"
      :floatingLabel="false"
    />
    <!-- TODO - Review design system, placeholders,
        and expected styles for this whole form with Jessica -->
  </form>

</template>


<script>

  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'RequestForm',
    mixins: [constantsTranslationMixin],
    computed: {
      licenses() {
        return [
          'CC BY',
          'CC BY-SA',
          'CC BY-ND',
          'CC BY-NC',
          'CC BY-NC-SA',
          'CC BY-NC-ND',
          'All Rights Reserved',
          'Public Domain',
          'Special Permissions',
        ];
      },
    },
    methods: {
      submit() {
        return undefined;
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      natureOfYourContentLabel: 'Nature of your content',
      storageAmountRequestedPlaceholder: 'Storage amount requested (e.g. 10GB)',
      approximatelyHowManyResourcesLabel:
        'Approximately how many individual resources are you planning to upload?',
      numberOfResourcesPlaceholder: 'Number of resources',
      averageSizeOfResourceLabel: 'Average size of each resource',
      sizePlaceholder: 'Size',
      kindOfContentQuestionLabel: 'What kind of content are you uploading? Please specify',
      typeOfContentPlaceholder: 'Type of content',
      authorLabel:
        'Who is the author (creator), curator (organizer), and/or aggregator (maintainer) of your content? Please specify',
      responsePlaceholder: 'Response',
      provideSampleLinkLabel:
        'Please provide a link to a sample of your content (on Studio or from source site)',
      pasteLinkPlaceholder: 'Paste link here',

      whoCanUseContentLabel: 'Who can use your content?',
      licensingQuestionLabel:
        'What is the licensing of the content you are uploading? (Check all that apply)',
      willYouMakeYourChannelPublicLabel:
        'If the content is openly licensed, would you be willing to consider making your channels public to other Kolibri users if requested in the future? (Select all that apply)',
      selectAllThatApplyPlaceholder: 'Select all that apply',

      howAreYouUsingYourContentLabel: 'How are you using your content?',
      intendedAudienceLabel:
        'Who is the intended audience for your channel? How big is your audience?',
      audiencePlaceholder: 'In-school learners, adult learners, teachers, etc',
      targetRegionsLabel: 'What is the target region(s) for your content (if applicable)',
      howOftenImportedToKolibriLabel:
        'How many times will this content be imported from Studio into new Kolibri installations per month, on average?',
      organizationalAffiliationLabel: 'Organizational affiliation',
      notAffiliatedLabel: 'I am not affiliated with an organization for this work',
      uploadingOnBehalfLabel: 'I am uploading content on behalf of:',
      organizationNamePlaceholder: 'Organization name',
      typeOfOrganizationLabel:
        'What type of organization or group is coordinating the use of Kolibri (if applicable)?',
      grassrootsLabel: 'Grassroots and/or volunteer initiative',
      smallNgoLabel: 'Small NGO with annual budget < $25k',
      mediumNgoLabel: 'Medium-sized NGO with budget < $500k',
      largeIntlNgoLabel: 'Larger INGO or other international agency',
      forProfitLabel: 'For-profit or social enterprise company',
      otherLabel: 'Other',

      timelineLabel:
        'To better understand the time sensitive nature of your request, please indicate an approximate timeline by when you need this additional storage:',
      oneWeekLabel: '1 week',
      twoToFourWeeksLabel: '2-4 weeks',
      coupleMonthsLabel: '1-2 months',
      threeToSixMonthsLabel: '3-6 months',
      sixPlusMonthsLabel: '6+ months',
      unknownLabel: 'Unknown',

      explainNeedsInDetailLabel:
        'Please write a paragraph explaining your needs and use case for Kolibri Studio, and how it will integrate into your programs. Include information about who is curating, deploying, and using the content. Is this work being coordinated by an organization, as part of an educational program? Include justification for the additional space being requested and explanation of the time sensitive nature of your request.',
      sendRequestAction: 'Send request',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

</style>
