<template>

  <PoliciesModal :policy="policyName" data-test="privacy-modal">
    <div class="privacy-wrapper">
      <p class="emphasis">
        {{ $tr('introductionHeader') }}
      </p>
      <p>
        {{ $tr('introductionP1Part1') }}
        <ActionLink
          :text="$tr('introductionP1TC')"
          @click="showTermsOfService"
        />
        {{ $tr('introductionP1Part2') }}
        <b>{{ $tr('introductionP1TU') }}</b>
        {{ $tr('introductionP1Part3') }}
      </p>
      <ul>
        <li>
          {{ $tr('introductionItem1Part1') }}
          <b>{{ $tr('introductionItem1Website') }}</b>
          {{ $tr('introductionItem1Part2') }}
        </li>
        <li>
          {{ $tr('introductionItem2Part1') }}
          <b>{{ $tr('introductionItem2Service') }}</b>
          {{ $tr('introductionItem2Part2') }}
        </li>
      </ul>
      <p>{{ $tr('introductionP2') }}</p>
      <p>{{ $tr('introductionP3') }}</p>
      <p>{{ $tr('introductionP4') }}</p>

      <!-- Table of contents -->
      <ol class="mb-4 text-uppercase toc">
        <li>
          <a href="#important-info">{{ $tr('importantInfoHeader') }}</a>
        </li>
        <li>
          <a href="#data-collection">{{ $tr('dataCollectionHeader') }}</a>
        </li>
        <li>
          <a href="#personal-data-collection">{{ $tr('personalDataCollectionHeader') }}</a>
        </li>
        <li>
          <a href="#personal-data-use">{{ $tr('personalDataUseHeader') }}</a>
        </li>
        <li>
          <a href="#personal-data-disclosure">{{ $tr('personalDataDisclosureHeader') }}</a>
        </li>
        <li>
          <a href="#international-transfers">{{ $tr('internationalTransfersHeader') }}</a>
        </li>
        <li>
          <a href="#data-security">{{ $tr('dataSecurityHeader') }}</a>
        </li>
        <li>
          <a href="#data-retention">{{ $tr('dataRetentionHeader') }}</a>
        </li>
        <li>
          <a href="#expectation-of-privacy">{{ $tr('expectationOfPrivacyHeader') }}</a>
        </li>
        <li>
          <a href="#legal-rights">{{ $tr('legalRightsHeader') }}</a>
        </li>
        <li>
          <a href="#contact-us">{{ $tr('contactUsHeader') }}</a>
        </li>
        <li>
          <a href="#cookies">{{ $tr('cookiesHeader') }}</a>
        </li>
        <li>
          <a href="#glossary">{{ $tr('glossaryHeader') }}</a>
        </li>
      </ol>

      <!-- 1. Important Information and Who We Are -->
      <div id="important-info" class="section">
        <h2>{{ $tr('importantInfoHeader') }}</h2>
        <p>
          {{ $tr('importantInfoP1Part1') }}
          <b>{{ $tr('importantInfoP1Terms') }}</b>
          {{ $tr('importantInfoP1Part2') }}
        </p>
        <p><b>{{ $tr('importantInfoP2') }}</b></p>
        <p>{{ $tr('importantInfoP3') }}</p>
        <ul>
          <li>{{ $tr('importantInfoItem1') }}</li>
          <li>{{ $tr('importantInfoItem2') }}</li>
          <li>{{ $tr('importantInfoItem3') }}</li>
        </ul>
        <p>
          {{ $tr('importantInfoP4Part1') }}
          <b>{{ $tr('importantInfoP4ICO') }}</b>
          {{ $tr('importantInfoP4Part2') }}
        </p>
        <p><b>{{ $tr('importantInfoP5') }}</b></p>
        <p>{{ $tr('importantInfoP6') }}</p>
        <p>{{ $tr('importantInfoP7') }}</p>
        <p>{{ $tr('importantInfoP8') }}</p>
        <p>{{ $tr('importantInfoP9') }}</p>
        <p><b>{{ $tr('importantInfoP10') }}</b></p>
        <p>{{ $tr('importantInfoP11') }}</p>
      </div>

      <!-- 2. The Data We Collect About You -->
      <div id="data-collection" class="section">
        <h2>{{ $tr('dataCollectionHeader') }}</h2>
        <p>{{ $tr('dataCollectionP1') }}</p>
        <ul>
          <li>{{ $tr('dataCollectionItem1') }}</li>
          <li>{{ $tr('dataCollectionItem2') }}</li>
          <li>{{ $tr('dataCollectionItem3') }}</li>
        </ul>
      </div>

      <!-- 3. How is Your Personal Data Collected? -->
      <div id="personal-data-collection" class="section">
        <h2>{{ $tr('personalDataCollectionHeader') }}</h2>
        <p>{{ $tr('personalDataCollectionP1') }}</p>
        <ul>
          <li>
            <b>{{ $tr('personalDataCollectionItem1Part1') }}</b>
            {{ $tr('personalDataCollectionItem1Part2') }}
          </li>
          <li>
            <b>{{ $tr('personalDataCollectionItem2Part1') }}</b>
            {{ $tr('personalDataCollectionItem2Part2') }}
          </li>
        </ul>
      </div>

      <!-- 4. How We Use Your Personal Data -->
      <div id="personal-data-use" class="section">
        <h2>{{ $tr('personalDataUseHeader') }}</h2>
        <p>{{ $tr('personalDataUseP1') }}</p>
        <ul>
          <li>{{ $tr('personalDataUseItem1') }}</li>
          <li>{{ $tr('personalDataUseItem2') }}</li>
          <li>{{ $tr('personalDataUseItem3') }}</li>
        </ul>
        <p>
          {{ $tr('personalDataUseP2Part1') }}
          <em>{{ $tr('personalDataUseP2Glossary') }}</em>
          {{ $tr('personalDataUseP2Part2') }}
        </p>
        <p>{{ $tr('personalDataUseP3') }}</p>
        <ul>
          <li>{{ $tr('personalDataUseItem4') }}</li>
          <li>{{ $tr('personalDataUseItem5') }}</li>
          <li>{{ $tr('personalDataUseItem6') }}</li>
        </ul>
      </div>

      <!-- 5. Disclosures of Your Personal Data -->
      <div id="personal-data-disclosure" class="section">
        <h2>{{ $tr('personalDataDisclosureHeader') }}</h2>
        <p>{{ $tr('personalDataDisclosureP1') }}</p>
        <ul>
          <li>{{ $tr('personalDataDisclosureItem1') }}</li>
          <li>{{ $tr('personalDataDisclosureItem2') }}</li>
          <li>{{ $tr('personalDataDisclosureItem3') }}</li>
          <li>{{ $tr('personalDataDisclosureItem4') }}</li>
        </ul>
        <p>{{ $tr('personalDataDisclosureP2') }}</p>
      </div>

      <!-- 6. International Transfers -->
      <div id="international-transfers" class="section">
        <h2>{{ $tr('internationalTransfersHeader') }}</h2>
        <p>{{ $tr('internationalTransfersP1') }}</p>
      </div>

      <!-- 7. Data Security -->
      <div id="data-security" class="section">
        <h2>{{ $tr('dataSecurityHeader') }}</h2>
        <p>{{ $tr('dataSecurityP1') }}</p>
        <p>{{ $tr('dataSecurityP2') }}</p>
        <p>{{ $tr('dataSecurityP3') }}</p>
      </div>

      <!-- 8. Data Retention -->
      <div id="data-retention" class="section">
        <h2>{{ $tr('dataRetentionHeader') }}</h2>
        <p>{{ $tr('dataRetentionP1') }}</p>
        <p>{{ $tr('dataRetentionP2') }}</p>
      </div>

      <!-- 9. Expectation of Privacy in Kolibri Studio -->
      <div id="expectation-of-privacy" class="section">
        <h2>{{ $tr('expectationOfPrivacyHeader') }}</h2>
        <p>
          {{ $tr('expectationOfPrivacyP1') }}
          <ActionLink
            :text="$tr('expectationOfPrivacyP1TC')"
            @click="showTermsOfService"
          />
        </p>
      </div>

      <!-- 10. Your Legal Rights -->
      <div id="legal-rights" class="section">
        <h2>{{ $tr('legalRightsHeader') }}</h2>
        <p>{{ $tr('legalRightsP1') }}</p>
        <ul>
          <li>{{ $tr('legalRightsItem1') }}</li>
          <li>{{ $tr('legalRightsItem2') }}</li>
          <li>{{ $tr('legalRightsItem3') }}</li>
          <li>{{ $tr('legalRightsItem4') }}</li>
          <li>{{ $tr('legalRightsItem5') }}</li>
          <li>{{ $tr('legalRightsItem6') }}</li>
          <li>{{ $tr('legalRightsItem7') }}</li>
        </ul>
        <p>{{ $tr('legalRightsP2') }}</p>
        <p>{{ $tr('legalRightsP3') }}</p>
        <p>{{ $tr('legalRightsP4') }}</p>
      </div>

      <!-- 11. Contact Us -->
      <div id="contact-us" class="section">
        <h2>{{ $tr('contactUsHeader') }}</h2>
        <p>{{ $tr('contactUsP1') }}</p>
      </div>

      <!-- 12. Cookies -->
      <div id="cookies" class="section">
        <h2>{{ $tr('cookiesHeader') }}</h2>
        <p>{{ $tr('cookiesP1') }}</p>
        <p>
          {{ $tr('cookiesP2') }}
          <ActionLink
            :text="$tr('cookieLink')"
            href="https://learningequality.org/cookies/"
            target="_blank"
          />
        </p>
      </div>

      <!-- 13. Glossary -->
      <div id="glossary" class="section">
        <h2>{{ $tr('glossaryHeader') }}</h2>
        <p><b>{{ $tr('glossaryP1Consent') }}</b>{{ $tr('glossaryP1') }}</p>
        <p><b>{{ $tr('glossaryP2LegitimateInterest') }}</b>{{ $tr('glossaryP2') }}</p>
        <p><b>{{ $tr('glossaryP3PerformanceOfContract') }}</b>{{ $tr('glossaryP3') }}</p>
        <p><b>{{ $tr('glossaryP4Comply') }}</b>{{ $tr('glossaryP4') }}</p>
        <p><b>{{ $tr('glossaryP5ThirdParty') }}</b>{{ $tr('glossaryP5') }}</p>
        <p><b>{{ $tr('glossaryP6') }}</b></p>
        <p>{{ $tr('glossaryP7') }}</p>
        <ul>
          <li><b>{{ $tr('glossaryItem1RequestAccess') }}</b>{{ $tr('glossaryItem1') }}</li>
          <li><b>{{ $tr('glossaryItem2RequestCorrection') }}</b>{{ $tr('glossaryItem2') }}</li>
          <li><b>{{ $tr('glossaryItem3RequestErasure') }}</b>{{ $tr('glossaryItem3') }}</li>
          <li><b>{{ $tr('glossaryItem4Object') }}</b>{{ $tr('glossaryItem4') }}</li>
          <li>
            <b>{{ $tr('glossaryItem5Restriction') }}</b>{{ $tr('glossaryItem5') }}
            <ul>
              <li>{{ $tr('glossarySubItem1') }}</li>
              <li>{{ $tr('glossarySubItem2') }}</li>
              <li>{{ $tr('glossarySubItem3') }}</li>
              <li>{{ $tr('glossarySubItem4') }}</li>
            </ul>
          </li>
          <li><b>{{ $tr('glossaryItem6RequestTransfer') }}</b>{{ $tr('glossaryItem6') }}</li>
          <li><b>{{ $tr('glossaryItem7WithdrawConsent') }}</b>{{ $tr('glossaryItem7') }}</li>
        </ul>
      </div>
    </div>
  </PoliciesModal>

</template>
<script>

  import { mapActions } from 'vuex';
  import PoliciesModal from './PoliciesModal';
  import { policies } from 'shared/constants';

  export default {
    name: 'PrivacyPolicyModal',
    components: {
      PoliciesModal,
    },
    computed: {
      policyName() {
        return policies.PRIVACY;
      },
    },
    methods: {
      ...mapActions('policies', ['openPolicy']),
      showTermsOfService() {
        this.openPolicy(policies.TERMS_OF_SERVICE);
      },
    },
    $trs: {
      // Introduction
      introductionHeader: 'Introduction',
      introductionP1Part1: 'This policy (together with our terms and conditions as set out here (“',
      introductionP1TC: 'Terms and Conditions',
      introductionP1Part2:
        '”) and any additional terms of use incorporated by reference into the Terms and Conditions, together our “',
      introductionP1TU: 'Terms of Use',
      introductionP1Part3: '”) applies to your use of:',
      introductionItem1Part1: 'our website at https://studio.learningequality.org/ (“',
      introductionItem1Website: 'Website',
      introductionItem1Part2: '”); and',
      introductionItem2Part1: 'the Kolibri Studio service accessible through the Website (“',
      introductionItem2Service: 'Service',
      introductionItem2Part2: '”).',
      introductionP2:
        'This policy sets out the basis on which any personal data we collect from you, or that you provide to us, will be processed by us.',
      introductionP3:
        'Please read the following carefully to understand our practices regarding your personal data and how we will treat it. We want you to be confident that the personal information you give us is safe and secure with us, and understand how we use it to improve the Service to benefit both you and our broader community of beneficiaries.',
      introductionP4:
        'This policy is provided in a layered format so you can click through to the specific areas set out below.',

      // 1. Important Information and Who We Are
      importantInfoHeader: 'Important Information and Who We Are',
      importantInfoP1Part1: 'Learning Equality (collectively referred to as ',
      importantInfoP1Terms: '"Learning Equality", "we", "us" or "our" ',
      importantInfoP1Part2:
        'in this policy), a nonprofit organization incorporated in the State of California, USA, is the controller in respect of your personal data.',
      importantInfoP2: 'Contact details',
      importantInfoP3: 'Our full details are:',
      importantInfoItem1: 'Full name of legal entity: Foundation for Learning Equality Inc',
      importantInfoItem2: 'Email address: legal@learningequality.org',
      importantInfoItem3: 'Postal address: 9700 Gilman Dr PMB 323, La Jolla, CA 92093, USA',
      importantInfoP4Part1:
        "Persons in the EU have the right to make a complaint at any time to the Information Commissioner's Office (",
      importantInfoP4ICO: '"ICO"',
      importantInfoP4Part2: '), the UK supervisory authority for data protection issues.',
      importantInfoP5: 'Changes to the privacy policy and your duty to inform us of changes',
      importantInfoP6: 'We keep our privacy policy under regular review.',
      importantInfoP7:
        'This version was last updated on Dec 10, 2020 and replaces with immediate effect any previous policy. We may, from time to time, make changes to this Privacy Policy to reflect any changes to our privacy practices in accordance with changes to legislation, best practice or Website enhancements. We will let you know what these changes are by posting them to this page. Where the changes are significant, we may also choose to email you with the new details and get your consent to make these changes where required by law. It is your responsibility as a user to make sure that you are aware of changes posted on this page, by checking for any changes on a regular basis. Changes posted on this page will become effective as soon as they are posted.',
      importantInfoP8:
        'We would encourage you to visit our Website regularly to stay informed of the purposes for which we process your information and your rights to control how we process it.',
      importantInfoP9:
        'It is important that the personal data we hold about you is accurate and current. Please keep us informed if your personal data changes during our relationship with you.',
      importantInfoP10: 'Third party links',
      importantInfoP11:
        'Our Website includes details on, or links through to, information provided by other third parties, our partner networks, advertisers and affiliates. Please note that these websites and any services that may be accessible through them have their own privacy policies and that we do not accept any responsibility or liability for these policies or for any personal data that may be collected through these websites or services, such as Contact and Location Data. Please check these policies before you submit any personal data to these websites or use these services.',

      // 2. The Data We Collect About You
      dataCollectionHeader: 'The Data We Collect About You',
      dataCollectionP1:
        'We may collect, use, store and transfer different kinds of data about you. We will limit the collection and processing of your personal data to information necessary to achieve one or more legitimate purposes as identified in this Privacy Policy. Personal data will include your:',
      dataCollectionItem1: 'Full name;',
      dataCollectionItem2: 'Email address; and',
      dataCollectionItem3: 'Location.',

      // 3. How is Your Personal Data Collected?
      personalDataCollectionHeader: 'How is Your Personal Data Collected?',
      personalDataCollectionP1: 'We will collect and process the following data about you:',
      personalDataCollectionItem1Part1: 'Information you give us. ',
      personalDataCollectionItem1Part2:
        'This is information you consent to giving us about you by filling in forms on our Website. It includes information you provide when you register to use the Website, subscribe to any of our services. If you contact us, we will keep a record of that correspondence.',
      personalDataCollectionItem2Part1: 'Information we collect about you and your device. ',
      personalDataCollectionItem2Part2:
        'This is information that we gather from the technology which you use to access our Website (for example IP address).',

      // 4. How We Use Your Personal Data
      personalDataUseHeader: 'How We Use Your Personal Data',
      personalDataUseP1:
        'We will only use your personal data when the law allows us to do so. Most commonly, we will use your personal data in the following circumstances:',
      personalDataUseItem1: 'Where you have consented before the processing.',
      personalDataUseItem2:
        'Where we need to perform a contract we are about to enter or have entered with you, as set out in our Terms and Conditions.',
      personalDataUseItem3: 'Where we need to comply with a legal or regulatory obligation.',
      personalDataUseP2Part1: 'Please refer to ',
      personalDataUseP2Glossary: 'Glossary: Lawful basis ',
      personalDataUseP2Part2:
        'to find out more about the types of lawful basis that we will rely on to process your personal data.',
      personalDataUseP3: 'Purposes for which we will use your personal data:',
      personalDataUseItem4: 'to properly register you on our Website;',
      personalDataUseItem5:
        'to send you emails at your request to help with logging into our Website (e.g. to reset your login details); and',
      personalDataUseItem6:
        'to alert you to changes to our services (e.g. changes to our Terms and Conditions).',

      // 5. Disclosures of Your Personal Data
      personalDataDisclosureHeader: 'Disclosures of Your Personal Data',
      personalDataDisclosureP1:
        'We will not share your personal data with anyone outside Learning Equality except:',
      personalDataDisclosureItem1: 'where we have your permission;',
      personalDataDisclosureItem2: 'where required for your service;',
      personalDataDisclosureItem3:
        'where we are required by law and by law enforcement agencies, judicial bodies, government entities, tax authorities or regulatory bodies around the world; and',
      personalDataDisclosureItem4:
        'where permitted by law, it is necessary for our legitimate interests or those of a third party, and it is not inconsistent with the purposes listed above.',
      personalDataDisclosureP2:
        'We will not share or sell your personal data with third parties without your permission.',

      // 6. International Transfers
      internationalTransfersHeader: 'International Transfers',
      internationalTransfersP1:
        'If you are located outside the European Economic Area (EEA) and have signed up to use our Website, your personal information will be transferred to our servers outside the EEA, located in the United States. The United States is deemed by the European Union to provide inadequate data protection. However, we have put in place safeguards to protect personal information transferred outside these jurisdictions, and will comply with the relevant data protection laws applicable to us, including the General Data Protection Regulation, to ensure a sufficient level of protection of your personal information. Please refer to the information set out in the Data security section below.',

      // 7. Data Security
      dataSecurityHeader: 'Data Security',
      dataSecurityP1:
        'We are committed to ensuring that your personal data is secure with us. All information you provide to us is stored on our secure servers. Where we have given you (or where you have chosen) a password that enables you to access certain parts of our Website, you are responsible for keeping this password confidential. We ask you not to share a password with anyone.',
      dataSecurityP2:
        'Once we have received your information, we will use strict procedures and security features to try to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way.',
      dataSecurityP3:
        'We have put in place procedures to deal with any suspected personal data breach and will notify you and any applicable regulator when we are legally required to do so.',

      // 8. Data Retention
      dataRetentionHeader: 'Data Retention',
      dataRetentionP1:
        'Your personal data will be processed for as long as necessary to fulfil the purposes we collected it for (as outlined in the How we use your personal data section above). For example, we will process your personal data for as long as necessary to continue to provide you with the Service on our Website.',
      dataRetentionP2:
        'In some circumstances, you can ask us to delete your data: see Your legal rights below for further information.',

      // 9. Expectation of Privacy In Kolibri Studio
      expectationOfPrivacyHeader: 'Expectation of Privacy In Kolibri Studio',
      expectationOfPrivacyP1:
        'The Kolibri ecosystem of tools make high quality education technology available in low-resource communities such as rural schools, refugee camps, orphanages, non-formal school systems, and prison systems. Kolibri Studio is the tool used to organize content and build content channels for the Kolibri Learning Platform, an open-source platform specially designed to provide offline access to freely distributable educational content. As such, with the exclusion of personally identifying information, records and products of activities undertaken within the platform (uploading, downloading, organizing, annotating, or creating content) are not private and there should be no expectation of privacy regarding the output of these activities. Learning Equality has access to all the generated content and other data in Kolibri Studio and handles it according to its ',
      expectationOfPrivacyP1TC: 'Terms and Conditions.',

      // 10. Your Legal Rights
      legalRightsHeader: 'Your Legal Rights',
      legalRightsP1:
        'Under certain circumstances, you have the following rights under data protection laws in relation to your personal data:',
      legalRightsItem1: 'Request access to your personal data',
      legalRightsItem2: 'Request correction of your personal data',
      legalRightsItem3: 'Request erasure of your personal data',
      legalRightsItem4: 'Object to processing of your personal data',
      legalRightsItem5: 'Request restriction of processing your personal data',
      legalRightsItem6: 'Request transfer of your personal data',
      legalRightsItem7: 'Right to withdraw consent',
      legalRightsP2:
        'Please refer to Glossary: Your legal rights for further elaboration of these terms.',
      legalRightsP3:
        'You also have the right to ask us not to continue to process your personal data for marketing purposes. ',
      legalRightsP4:
        'You can exercise any of these rights at any time by contacting us at legal@learningequality.org.',

      // 11. Contact Us
      contactUsHeader: 'Contact Us',
      contactUsP1:
        'If you would like any further information about any of the matters in this policy or if you have any other questions about how we collect, store or use your personal data, you may contact us at legal@learningequality.org.',

      // 12. Cookies
      cookiesHeader: 'Cookies',
      cookiesP1:
        'Cookies are used by the Website to support with the proper functioning of the service, such as tracking your session for the duration of the time you spend logged in, and for analytics purposes that help with continually improving the platform to better serve your needs.',
      cookiesP2:
        'To learn more, and make choices regarding what cookies you wish to allow, please refer to our',
      cookieLink: 'Cookie Policy.',

      // 13. Glossary
      glossaryHeader: 'Glossary',
      glossaryP1Consent: 'Consent',
      glossaryP1:
        ' means processing your personal data where you have signified your agreement by a statement or clear opt-in to processing for a specific purpose. Consent will only be valid if it is a freely given, specific, informed and unambiguous indication of what you want. You can withdraw your consent at any time by contacting us.',
      glossaryP2LegitimateInterest: 'Legitimate interest',
      glossaryP2:
        ' means the interest of our business in conducting and managing our business to enable us to give you the best service/product and the best and most secure experience. We make sure we consider and balance any potential impact on you (both positive and negative) and your rights before we process your personal data for our legitimate interests. We do not use your personal data for activities where our interests are overridden by the impact on you (unless we have your consent or are otherwise required or permitted to by law). You can obtain further information about how we assess our legitimate interests against any potential impact on you in respect of specific activities by contacting us.',
      glossaryP3PerformanceOfContract: 'Performance of contract',
      glossaryP3:
        ' means processing your data where it is necessary for the performance of a contract to which you are a party or to take steps at your request before entering into such a contract.',
      glossaryP4Comply: 'Comply with a legal obligation',
      glossaryP4:
        ' means processing your personal data where it is necessary for compliance with a legal obligation that we are subject to.',
      glossaryP5ThirdParty: 'Third parties',
      glossaryP5: ' means anyone outside of Learning Equality personnel.',
      glossaryP6: 'Your legal rights',
      glossaryP7: 'Persons in the EEA have the right to:',
      glossaryItem1RequestAccess: 'Request access to your personal data',
      glossaryItem1:
        ' (commonly known as a "data subject access request"). This enables you to receive a copy of the personal data we hold about you and to check that we are lawfully processing it.',
      glossaryItem2RequestCorrection:
        'Request correction of the personal data that we hold about you.',
      glossaryItem2:
        ' This enables you to have any incomplete or inaccurate data we hold about you corrected, though we may need to verify the accuracy of the new data you provide to us.',
      glossaryItem3RequestErasure: 'Request erasure of your personal data.',
      glossaryItem3:
        ' This enables you to ask us to delete or remove personal data where there is no good reason for us continuing to process it. You also have the right to ask us to delete or remove your personal data where you have successfully exercised your right to object to processing (see below), where we may have processed your information unlawfully or where we are required to erase your personal data to comply with local law. Note, however, that we may not always be able to comply with your request of erasure for specific legal reasons which will be notified to you, if applicable, at the time of your request.',
      glossaryItem4Object: 'Object to processing of your personal data',
      glossaryItem4:
        ' where we are relying on a legitimate interest (or those of a third party) and there is something about your particular situation which makes you want to object to processing on this ground as you feel it impacts on your fundamental rights and freedoms. You also have the right to object where we are processing your personal data for direct marketing purposes. In some cases, we may demonstrate that we have compelling legitimate grounds to process your information which override your rights and freedoms.',
      glossaryItem5Restriction: 'Request restriction of processing of your personal data.',
      glossaryItem5:
        ' This enables you to ask us to suspend the processing of your personal data in the following scenarios:',
      glossarySubItem1: "if you want us to establish the data's accuracy;",
      glossarySubItem2: 'where our use of the data is unlawful but you do not want us to erase it;',
      glossarySubItem3:
        'where you need us to hold the data even if we no longer require it as you need it to establish, exercise or defend legal claims; or',
      glossarySubItem4:
        'you have objected to our use of your data but we need to verify whether we have overriding legitimate grounds to use it.',
      glossaryItem6RequestTransfer:
        'Request the transfer of your personal data to you or to a third party.',
      glossaryItem6:
        ' We will provide to you, or a third party you have chosen, your personal data in a structured, commonly used, machine-readable format. Note that this right only applies to automated information which you initially provided consent for us to use or where we used the information to perform a contract with you.',
      glossaryItem7WithdrawConsent:
        'Withdraw consent at any time where we are relying on consent to process your personal data.',
      glossaryItem7:
        ' However, this will not affect the lawfulness of any processing carried out before you withdraw your consent. If you withdraw your consent, we may not be able to provide certain products or services to you. We will advise you if this is the case at the time you withdraw your consent.',
    },
  };

</script>

<style scoped>
  .emphasis {
    text-transform: uppercase;
    font-weight: bold;
  }

  .privacy-wrapper {
    counter-reset: section;
  }
  .section {
    margin-bottom: 24px;
  }
  h2::before {
    counter-increment: section;
    content: counter(section) ". ";
  }

  ul {
    margin-bottom: 16px;
  }
  li {
    margin: 0px 24px;
  }

  .toc li {
    margin-bottom: 8px;
  }
</style>
