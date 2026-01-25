<template>

  <PoliciesModal
    :policy="policy"
    :title="title"
    :needsAcceptance="needsAcceptance"
    data-test="tos-modal"
    @accept="$emit('accept', policy)"
    @close="$emit('close')"
  >
    <div class="tos-wrapper">
      <p class="emphasis">
        {{ $tr('prompt') }}
      </p>
      <p>{{ $tr('disclaimerP1') }}</p>
      <p>{{ $tr('disclaimerP2') }}</p>
      <p class="text-uppercase">
        {{ $tr('disclaimerP3') }}
      </p>

      <!-- Table of contents -->
      <ol class="mb-4 text-uppercase toc">
        <li>
          <a href="#definitions">{{ $tr('definitionsHeader') }}</a>
        </li>
        <li>
          <a href="#account-terms">{{ $tr('accountTermsHeader') }}</a>
        </li>
        <li>
          <a href="#acceptable-use">{{ $tr('acceptableUseHeader') }}</a>
        </li>
        <li>
          <a href="#user-content">{{ $tr('userContentHeader') }}</a>
        </li>
        <li>
          <a href="#licensing">{{ $tr('licensingHeader') }}</a>
        </li>
        <li>
          <a href="#dmca">{{ $tr('dmcaHeader') }}</a>
        </li>
        <li>
          <a href="#intellectual-property">{{ $tr('intellectualPropertyHeader') }}</a>
        </li>
        <li>
          <a href="#community-standards">{{ $tr('communityStandardsHeader') }}</a>
        </li>
        <li>
          <a href="#privacy">{{ $tr('yourPrivacyHeader') }}</a>
        </li>
        <li>
          <a href="#cancellation">{{ $tr('cancellationHeader') }}</a>
        </li>
        <li>
          <a href="#communications">{{ $tr('communicationsHeader') }}</a>
        </li>
        <li>
          <a href="#warranties">{{ $tr('warrantyHeader') }}</a>
        </li>
        <li>
          <a href="#changes">{{ $tr('changesToToSHeader') }}</a>
        </li>
        <li>
          <a href="#jurisdiction">{{ $tr('jurisdictionHeader') }}</a>
        </li>
        <li>
          <a href="#arbitration">{{ $tr('arbitrationHeader') }}</a>
        </li>
        <li>
          <a href="#liability">{{ $tr('liabilityHeader') }}</a>
        </li>
        <li>
          <a href="#third-party">{{ $tr('thirdPartyHeader') }}</a>
        </li>
        <li>
          <a href="#third-party-rights">{{ $tr('thirdPartyRightsHeader') }}</a>
        </li>
        <li>
          <a href="#indemnification">{{ $tr('indemnificationHeader') }}</a>
        </li>
        <li>
          <a href="#miscellaneous">{{ $tr('miscellaneousHeader') }}</a>
        </li>
      </ol>

      <!-- Definitions -->
      <div
        id="definitions"
        class="section"
      >
        <h2>{{ $tr('definitionsHeader') }}</h2>
        <p>{{ $tr('definitionsP1') }}</p>
        <p>{{ $tr('definitionsP2') }}</p>
        <p>{{ $tr('definitionsP3') }}</p>
        <p>{{ $tr('definitionsP4') }}</p>
      </div>

      <!-- Account Terms -->
      <div
        id="account-terms"
        class="section"
      >
        <h2>{{ $tr('accountTermsHeader') }}</h2>
        <p>{{ $tr('accountTermsP1') }}</p>
        <p>{{ $tr('accountTermsP2') }}</p>
        <p>{{ $tr('accountTermsP3') }}</p>
      </div>

      <!-- Acceptable Use Restrictions -->
      <div
        id="acceptable-use"
        class="section"
      >
        <h2>{{ $tr('acceptableUseHeader') }}</h2>
        <p>{{ $tr('acceptableUseP1') }}</p>
        <ul>
          <li>{{ $tr('acceptableUseItem1') }}</li>
          <li>{{ $tr('acceptableUseItem2') }}</li>
          <li>{{ $tr('acceptableUseItem3') }}</li>
          <li>{{ $tr('acceptableUseItem4') }}</li>
          <li>{{ $tr('acceptableUseItem5') }}</li>
          <li>{{ $tr('acceptableUseItem6') }}</li>
          <li>{{ $tr('acceptableUseItem7') }}</li>
          <li>{{ $tr('acceptableUseItem8') }}</li>
          <li>{{ $tr('acceptableUseItem9') }}</li>
          <li>{{ $tr('acceptableUseItem10') }}</li>
          <li>{{ $tr('acceptableUseItem11') }}</li>
        </ul>
      </div>

      <!-- User-Generated Content -->
      <div
        id="user-content"
        class="section"
      >
        <h2>{{ $tr('userContentHeader') }}</h2>
        <p>{{ $tr('userContentP1') }}</p>
        <ul>
          <li>{{ $tr('userContentList1Item1') }}</li>
          <li>{{ $tr('userContentList1Item2') }}</li>
          <li>{{ $tr('userContentList1Item3') }}</li>
          <li>{{ $tr('userContentList1Item4') }}</li>
          <li>{{ $tr('userContentList1Item5') }}</li>
          <li>{{ $tr('userContentList1Item6') }}</li>
        </ul>
        <p>{{ $tr('userContentP2') }}</p>
        <ul>
          <li>{{ $tr('userContentList2Item1') }}</li>
          <li>{{ $tr('userContentList2Item2') }}</li>
          <li>{{ $tr('userContentList2Item3') }}</li>
        </ul>
        <p>{{ $tr('userContentP3') }}</p>
        <p>{{ $tr('userContentP4') }}</p>
        <ul>
          <li>{{ $tr('userContentList3Item1') }}</li>
          <li>{{ $tr('userContentList3Item2') }}</li>
        </ul>
      </div>

      <!-- Licensing and Copyright -->
      <div
        id="licensing"
        class="section"
      >
        <h2>{{ $tr('licensingHeader') }}</h2>
        <p>{{ $tr('licensingP1') }}</p>
        <ul>
          <li>{{ $tr('licensingList1Item1') }}</li>
          <li>{{ $tr('licensingList1Item2') }}</li>
          <li>{{ $tr('licensingList1Item3') }}</li>
        </ul>
        <p>{{ $tr('licensingP2') }}</p>
        <ul>
          <li>{{ $tr('licensingList2Item1') }}</li>
          <li>{{ $tr('licensingList2Item2') }}</li>
        </ul>
      </div>

      <!-- DMCA Policy -->
      <div
        id="dmca"
        class="section"
      >
        <h2>{{ $tr('dmcaHeader') }}</h2>
        <p>{{ $tr('dmcaP1') }}</p>
        <p>
          <KExternalLink
            :text="$tr('dmcaLink')"
            href="https://docs.google.com/forms/d/e/1FAIpQLSd7qWORCOOczCnOlDzaftIjBsaUtl3DKH3hbxlO1arRc1_IQg/viewform?usp=sf_link"
            target="_blank"
          />
        </p>
      </div>

      <!-- Intellectual Property Notice -->
      <div
        id="intellectual-property"
        class="section"
      >
        <h2>{{ $tr('intellectualPropertyHeader') }}</h2>
        <p>{{ $tr('intellectualPropertyP1') }}</p>
      </div>

      <!-- Community Standards -->
      <div
        id="community-standards"
        class="section"
      >
        <h2>{{ $tr('communityStandardsHeader') }}</h2>
        <p>{{ $tr('communityStandardsP1') }}</p>
        <p>
          <KRouterLink
            :text="$tr('communityStandardsLink')"
            :to="{ query: { showPolicy: policies.COMMUNITY_STANDARDS }}"
          />
        </p>
      </div>

      <!-- Your Privacy -->
      <div
        id="privacy"
        class="section"
      >
        <h2>{{ $tr('yourPrivacyHeader') }}</h2>
        <p>{{ $tr('yourPrivacyP1') }}</p>
        <p>
          <KRouterLink
            :text="$tr('yourPrivacyLink')"
            :to="{query: { showPolicy: policies.PRIVACY } }"
          />
        </p>
      </div>

      <!-- Cancellation or Termination -->
      <div
        id="cancellation"
        class="section"
      >
        <h2>{{ $tr('cancellationHeader') }}</h2>
        <p>{{ $tr('cancellationP1') }}</p>
        <p>{{ $tr('cancellationP2') }}</p>
        <ul>
          <li>{{ $tr('cancellationItem1') }}</li>
          <li>{{ $tr('cancellationItem2') }}</li>
        </ul>
        <p>{{ $tr('cancellationP3') }}</p>
        <p>{{ $tr('cancellationP4') }}</p>
      </div>

      <!-- Communications with Learning Equality -->
      <div
        id="communications"
        class="section"
      >
        <h2>{{ $tr('communicationsHeader') }}</h2>
        <p>{{ $tr('communicationsP1') }}</p>
      </div>

      <!-- Disclaimer of Warranties -->
      <div
        id="warranties"
        class="section"
      >
        <h2>{{ $tr('warrantyHeader') }}</h2>
        <p class="text-uppercase">
          {{ $tr('warrantyHeaderP1') }}
        </p>
      </div>

      <!-- Changes to these Terms of Service -->
      <div
        id="changes"
        class="section"
      >
        <h2>{{ $tr('changesToToSHeader') }}</h2>
        <p>{{ $tr('changesToToSP1') }}</p>
      </div>

      <!-- Jurisdiction and Applicable Law -->
      <div
        id="jurisdiction"
        class="section"
      >
        <h2>{{ $tr('jurisdictionHeader') }}</h2>
        <p>{{ $tr('jurisdictionP1') }}</p>
      </div>

      <!-- Arbitration Agreement -->
      <div
        id="arbitration"
        class="section"
      >
        <h2>{{ $tr('arbitrationHeader') }}</h2>
        <p>{{ $tr('arbitrationP1') }}</p>
      </div>

      <!-- Limitation of Liability -->
      <div
        id="liability"
        class="section"
      >
        <h2>{{ $tr('liabilityHeader') }}</h2>
        <p class="text-uppercase">
          {{ $tr('liabilityP1') }}
        </p>
      </div>

      <!-- Third Party Content and Third Party Applications -->
      <div
        id="third-party"
        class="section"
      >
        <h2>{{ $tr('thirdPartyHeader') }}</h2>
        <p class="text-uppercase">
          {{ $tr('thirdPartyP1') }}
        </p>
      </div>

      <!-- Third Party Rights -->
      <div
        id="third-party-rights"
        class="section"
      >
        <h2>{{ $tr('thirdPartyRightsHeader') }}</h2>
        <p>{{ $tr('thirdPartyRightsP1') }}</p>
      </div>

      <!-- Indemnification -->
      <div
        id="indemnification"
        class="section"
      >
        <h2>{{ $tr('indemnificationHeader') }}</h2>
        <p>{{ $tr('indemnificationP1') }}</p>
      </div>

      <!-- Miscellaneous -->
      <div
        id="miscellaneous"
        class="section"
      >
        <h2>{{ $tr('miscellaneousHeader') }}</h2>
        <p>{{ $tr('miscellaneousP1') }}</p>
        <p>{{ $tr('miscellaneousP2') }}</p>
        <p>{{ $tr('miscellaneousP3') }}</p>
      </div>
    </div>
  </PoliciesModal>

</template>


<script>

  import PoliciesModal from './PoliciesModal';
  import { policies } from 'shared/constants';

  export default {
    name: 'TermsOfServiceModal',
    components: {
      PoliciesModal,
    },
    props: {
      needsAcceptance: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        policies,
      };
    },
    computed: {
      policy() {
        return this.policies.TERMS_OF_SERVICE;
      },
      title() {
        return this.needsAcceptance ? this.$tr('updatedToSHeader') : this.$tr('ToSHeader');
      },
    },
    $trs: {
      ToSHeader: 'Terms of Service',
      updatedToSHeader: 'Updated terms of service',

      prompt: 'Please read these terms and conditions carefully',
      disclaimerP1:
        'Before using this website, you should read the following important information relating to it. These Terms of Service ("Terms") govern your use of this website and form a legally binding agreement between you and us regarding your use of our website.',
      disclaimerP2:
        'If, for any reason, you are unable or unwilling to agree to all of these Terms, please immediately discontinue using or attempting to use the service.',
      disclaimerP3:
        'By continuing to use the Service you agree to these terms which will bind you.',

      // Definitions
      definitionsHeader: 'Definitions',
      definitionsP1:
        'These are the Terms for the web application hosted at https://studio.learningequality.org/, along with any API\'s or other interfaces it provides (the "Service"), controlled and operated by Learning Equality ("Learning Equality", "we", "us" and "our"). We are registered as a nonprofit organization in California, USA under EIN 46-2676188, and have our registered office at 9700 Gilman Dr, PMB 323, La Jolla, CA 92093.',
      definitionsP2:
        'These Terms describe our commitments to you, and your rights and responsibilities when using the Service. If you breach any of these Terms, your right to access and use of the Service and Service will be terminated. Please read them carefully and reach out to us if you have any questions.',
      definitionsP3:
        '"Content" refers to media files (such as videos, audio files, HTML5 content, or other materials) that are hosted on the Service, along with their associated descriptive metadata.',
      definitionsP4:
        'Throughout these Terms, "you" applies to both individuals and entities that access or use the Service. If you are an individual using the Service on behalf of an entity, you represent and warrant that you have the authority to bind that entity to the Agreement and that by using our Service, you are accepting the Agreement on behalf of that entity.',

      // Account terms
      accountTermsHeader: 'Account Terms',
      accountTermsP1:
        'When you register for an account on the Service, you agree to provide us with complete and accurate information. You will be solely responsible and liable for any activity that occurs under your username. You are responsible for keeping your account information up-to-date and for keeping your access credentials (password and API token) private and secure.',
      accountTermsP2:
        'You are responsible for maintaining the security of your account and any Service-related content, and you are fully responsible for all activities that occur under your account and any other actions taken in connection with the Service. You shall not share or misuse your access credentials. You must immediately notify us of any unauthorized uses of your account, or of any other breach of security. We will not be liable for any acts or omissions by you, including any damages of any kind incurred as a result of such acts or omissions.',
      accountTermsP3:
        'Access to and use of the Service is only for those over the age of 13 (or 16 in the European Union). If you are younger than this, you may not register for or use the Service. Any person who registers as a user or provides their personal information to the Service represents that they are 13 years of age or older (or 16 years or older in the European Union).',

      // Acceptable Use Restrictions
      acceptableUseHeader: 'Acceptable Use Restrictions',
      acceptableUseP1: 'You represent and warrant that your use of the Service:',
      acceptableUseItem1: 'Will be in strict accordance with these Terms;',
      acceptableUseItem2:
        'Will comply with all applicable laws and regulations (including, without limitation, all applicable laws regarding online conduct and acceptable content, privacy, data protection, and the transmission of technical data exported from the United States or the country in which you reside);',
      acceptableUseItem3:
        'Will not use the Services for any unlawful purposes, to publish illegal content, or in furtherance of illegal activities;',
      acceptableUseItem4:
        'Will not transmit any material that is defamatory, offensive or otherwise objectionable in relation to your use of the Service;',
      acceptableUseItem5:
        'Will not infringe or misappropriate the intellectual property rights of any third party;',
      acceptableUseItem6:
        "Will not overburden Learning Equality's systems, as determined by us in our sole discretion, including but not limited to excessive bandwidth utilization or number of requests;",
      acceptableUseItem7:
        'Will not attempt to circumvent your assigned storage quota or other account restrictions through technical or other means;',
      acceptableUseItem8: 'Will not disclose sensitive personal information of others;',
      acceptableUseItem9: 'Will not be used to send spam or bulk unsolicited messages;',
      acceptableUseItem10:
        'Will not interfere with, disrupt, or attack any service or network; and',
      acceptableUseItem11:
        'Will not be used to create, distribute, or enable material that is - or that facilitates or operates in conjunction with - malware, spyware, adware, or other malicious programs or code.',

      // User-Generated Content
      userContentHeader: 'User-Generated Content',
      userContentP1:
        'We have not reviewed, and cannot review, all of the Content (such as, but not limited to, text, photo, video, audio, code, computer software, or other materials) uploaded to or authored using the Service by users or anyone else and are not responsible for any use or effects of such Content. So, for example:',
      userContentList1Item1:
        'We do not endorse any uploaded Content or represent that Content is accurate, useful, or non-harmful. Content could be offensive, indecent, or objectionable; include technical inaccuracies, typographical mistakes, or other errors; or violate or infringe the privacy, publicity rights, intellectual property rights (see our Copyright Infringement and DMCA Policy section to submit copyright complaints), or other proprietary rights of third parties.',
      userContentList1Item2:
        'If you upload or author Content, or otherwise make (or allow any third party to make) Content available on the Service, you are entirely responsible for the Content, and any harm resulting from, that Content or your conduct.',
      userContentList1Item3:
        'You are responsible for ensuring that you have proper permissions to upload and distribute any and all uploaded Content and for ensuring that the copyright holder and licensing are properly evidenced on the uploaded Content.',
      userContentList1Item4:
        "We disclaim any responsibility for any harm resulting from anyone's use or downloading of Content. If you access or use any Content, you are responsible for taking precautions as necessary to protect yourself and your computer systems from viruses, worms, Trojan horses, and other harmful or destructive content.",
      userContentList1Item5:
        'We are not a party to, and will have no responsibility or liability for, any communications, transactions, interactions, or disputes between you and the provider of any Content.',
      userContentList1Item6:
        'Please note that additional third party terms and conditions may apply to the downloading, copying, or use of Content.',
      userContentP2:
        'We also have not reviewed, and cannot review, all of the material made available through the websites and web pages that link to, or are linked from the Service. For example:',
      userContentList2Item1:
        'We do not have any control over those websites and are not responsible for their contents or their use.',
      userContentList2Item2:
        'The existence of a link to or from the Service does not represent or imply that we endorse such website.',
      userContentList2Item3:
        'You are responsible for taking precautions as necessary to protect yourself and your computer systems from viruses, worms, Trojan horses, and other harmful or destructive content.',
      userContentP3:
        'We reserve the right to remove any Content that violates our Terms or for any other reason.',
      userContentP4: 'Please note we cannot:',
      userContentList3Item1:
        'remove or force upgrades of copies of Content that have already been downloaded from the Service, except in cases in which the Kolibri Learning Application is running on a server that is under our control. This may mean that when we delete uploaded content not all copies will be removed.',
      userContentList3Item2:
        'remove or change the licensing on old versions of Content that others have made copies of, should you change the licensing on your content and/or request a removal of the Content from us. When a Creative Commons license is applied to a specific version of a piece of Content, the rights conferred to others for distribution and use of that Content cannot be revoked. Whilst we cannot remove or force updates on copies of the Content, we would let you update the license on your own copy of the Content moving forward, and for future versions.',

      // Licensing and Copyright
      licensingHeader: 'Licensing and Copyright',
      licensingP1:
        'The Service allows you to upload and distribute Content. When you do, the following terms apply:',
      licensingList1Item1:
        "Copyright ownership of the Content is retained by the original copyright holder and must be indicated, and license information must be marked so as to accurately reflect the copyright holder's intentions around the distribution and use of that Content.",
      licensingList1Item2:
        'If you are not yourself the copyright holder, you must have the rights to distribute the uploaded Content, either through explicit written permission from the copyright holder, or as allowed by the terms of the license under which the Content has been released.',
      licensingList1Item3:
        'If you are the copyright holder of the uploaded content, then by marking the Content you upload with a particular license, you are agreeing for the Content to be distributed and used under the terms of that license in perpetuity.',
      licensingP2:
        'We follow a policy of making content, including its associated metadata, as open as possible while following the appropriate copyright laws. With this in mind, we distinguish between:',
      licensingList2Item1:
        'Descriptive metadata: This includes primary metadata associated with a single piece of Content, for example, titles, descriptions, and other elements which constitute a definitive part of the Content regardless of which system it appears on. These metadata elements will fall under the same copyright and licensing as the Content itself.',
      licensingList2Item2:
        'Organizational metadata: This defines how a piece of content may be used, aids with discovery, and places it within some broader structure of relations on the Service, for example, tags, curation into folders (including the titles of those folders), and other elements pertaining to the display and ordering of Content on the system itself. By using the Service, you agree that work you do to generate organizational metadata elements are released into the Public Domain, and may be made available for others to use, without any claim to copyright or restricted licensing. We may also share, leverage and distribute this organizational metadata. This is so that we can benefit others and improve the impact of our platforms.',

      // DMCA Policy
      dmcaHeader: 'DMCA Policy',
      dmcaP1:
        'As we ask others to respect our intellectual property rights, we respect the intellectual property rights of others. If you believe that material located on or associated with the Service violates your copyright, please notify us in accordance with our Digital Millennium Copyright Act ("DMCA") Policy. We will respond to all such notices, including as required or appropriate by removing the infringing material or disabling all links to the infringing material. We will terminate a visitor\'s access to and use of the website if, under appropriate circumstances, the visitor is determined to be a repeat infringer of copyrights or other intellectual property rights. In the case of such termination, we will have no obligation to provide a refund of any payments or other forms of restitution.',
      dmcaLink: 'Report a violation',

      // Intellectual Property Notice
      intellectualPropertyHeader: 'Intellectual Property Notice',
      intellectualPropertyP1:
        'The Agreement does not transfer from Learning Equality to you any Learning Equality or third party intellectual property, and all right, title, and interest in and to such property will remain (as between the parties) solely with Learning Equality. "Kolibri", "Kolibri Studio", "Learning Equality", the Kolibri logo, and all other trademarks, service marks, graphics, and logos used in connection with learningequality.org or the Service, are trademarks or registered trademarks of Learning Equality or Learning Equality\'s licensors. Other trademarks, service marks, graphics, and logos used in connection with the Service may be the trademarks of other third parties. Your use of the Service grants you no right or license to reproduce or otherwise use any Learning Equality or third party trademarks and any such use may constitute an infringement of the holder\'s rights',

      // Community Standards
      communityStandardsHeader: 'Community Standards',
      communityStandardsP1:
        'For more information about the intended use of the Service, and standards around Content, please see our Community Standards page.',
      communityStandardsLink: "Learn more about Studio's community standards",

      // Your Privacy
      yourPrivacyHeader: 'Your Privacy',
      yourPrivacyP1:
        'We take your privacy seriously. Please read our Privacy Policy to see how we collect, use and protect your personal data.',
      yourPrivacyLink: "Learn more about Studio's privacy policy",

      // Cancellation and Termination
      cancellationHeader: 'Cancellation or Termination',
      cancellationP1:
        'We may terminate or restrict your access to all or any part of the Service at any time, with or without cause, with or without notice, effective immediately. We have the right (though not the obligation) to, in our sole discretion, (i) close down an account or remove content due to prolonged inactivity, (ii) refuse or remove any content that, in our reasonable opinion, violates any Learning Equality policy (including our Community Standards) or is in any way harmful or objectionable, or (iii) terminate or deny access to and use of the Service to any individual or entity for any reason. We will have no obligation to provide a refund of any amounts previously paid.',
      cancellationP2: 'If we end your rights to use the Service:',
      cancellationItem1:
        'You must stop all activities authorized by these Terms, including your use of the Service.',
      cancellationItem2:
        'You must not register and create a new account under your name, a fake or borrowed name, or the name of any third party, even if you may be acting on behalf of the third party.',
      cancellationP3:
        'In addition to terminating or suspending your account, we reserve the right to take appropriate legal action, including without limitation pursuing civil, criminal, and injunctive action for violating these Terms.',
      cancellationP4:
        'All provisions of the Agreement which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.',

      // Communications with Learning Equality
      communicationsHeader: 'Communications with Learning Equality',
      communicationsP1:
        'For contractual purposes, you (1) consent to receive communications from us in an electronic form via the email address you have submitted or via the Service; and (2) agree that all Terms of Service, agreements, notices, disclosures, and other communications that we provide to you electronically satisfy any legal requirement that those communications would satisfy if they were on paper. This section does not affect your non-waivable rights.',

      // Disclaimer of Warranties
      warrantyHeader: 'Disclaimer of Warranties',
      warrantyHeaderP1:
        'You acknowledge that the website and the Service is provided "as is" and "as available", with all faults and without warranty of any kind, and we hereby disclaim all warranties and conditions with respect to the website and Service, either express, implied or statutory, including, but not limited to, any implied warranties and/or conditions of merchantability, of satisfactory quality, of fitness for a particular purpose, of accuracy, and non-infringement of third party rights. Any use of the Service and website is at your own risk. Some jurisdictions do not allow the exclusion of implied warranties, so the above limitations may not apply to you.',

      // Changes to these Terms of Service
      changesToToSHeader: 'Changes to these Terms of Service',
      changesToToSP1:
        'We are constantly updating our Service and that means sometimes we have to change the legal terms under which our Service is offered. These Terms may only be modified by a written amendment signed by an authorized executive of Learning Equality, or by the posting by Learning Equality of a revised version. If we make changes that are material, we will let you know by posting on one of our blogs, or by sending you an email or other communication before the changes take effect. The notice will designate a reasonable period of time after which the new terms will take effect. If you disagree with our changes, then you should stop using the Service within the designated notice period, or once the changes become effective. Your continued use of the Service will be subject to the new terms. However, any dispute that arose before the changes shall be governed by the Terms (including the binding individual arbitration clause) that were in place when the dispute arose.',

      // Jurisdiction and Applicable Law
      jurisdictionHeader: 'Jurisdiction and Applicable Law',
      jurisdictionP1:
        'Except to the extent any applicable law provides otherwise, the Agreement and any access to or use of the Service will be governed by the laws of the state of California, U.S.A., excluding its conflict of law provisions. The proper venue for any disputes arising out of or relating to the Agreement and any access to or use of the Service will be the state and federal courts located in San Diego County, California.',

      // Arbitration Agreement
      arbitrationHeader: 'Arbitration Agreement',
      arbitrationP1:
        'Except for claims for injunctive or equitable relief or claims regarding intellectual property rights (which may be brought in any competent court without the posting of a bond), any dispute arising under the Agreement shall be finally settled in accordance with the Comprehensive Arbitration Rules of the Judicial Arbitration and Mediation Service, Inc. ("JAMS") by three arbitrators appointed in accordance with such Rules. The arbitration shall take place in San Diego, California, in the English language and the arbitral decision may be enforced in any court. The prevailing party in any action or proceeding to enforce the Agreement shall be entitled to costs and attorneys\' fees.',

      // Limitation of Liability
      liabilityHeader: 'Limitation of Liability',
      liabilityP1:
        'To the extent legally permitted under the applicable law, Learning Equality shall not be responsible for any loss or damage to you, your customers or third parties caused by failure of the website to function. In no event will Learning Equality be liable for any special, consequential, incidental, or indirect damages (including, without limitation, those resulting from lost profits, cost of substitute goods or services, lost data or business interruption) in connection with the use of the website or Service of in connection with any other claim arising from these Terms of Service. The aggregate liability of Learning Equality arising from or relating to these Terms and the Service, regardless of the form of action or claim (contract, tort or otherwise) and even if you have been advised of the possibility of such damages shall not exceed the amount paid by you during the twelve (12) month period prior to the cause of action. Nothing in these Terms shall limit or exclude Learning Equality liability for gross negligence or for death or personal injury. Applicable law may not allow the exclusion or limitation of incidental or consequential damages, so the above limitation or exclusion may not apply to you.',

      // Third Party Content and Third Party Applications
      thirdPartyHeader: 'Third Party Content and Third Party Applications',
      thirdPartyP1:
        'The links to third party websites, any third party content, and any third party applications may be provided for your convenience and information only. The content on any linked website or in any third party application is not under our control and we are not responsible for the content of linked websites and/or third party applications, including any further links contained in a third party website. We make no representations or warranties in connection with any third party content or third party applications, which at all times and in each instance is provided "as is." Third party applications may be subject to additional policies and conditions or agreements between you and the provider of such third party applications. You agree to fully comply with all such additional policies, conditions and agreements. If you decide to access any third party content, and/or any third party application, you do so entirely at your own risk.',

      // Third Party Rights
      thirdPartyRightsHeader: 'Third Party Rights',
      thirdPartyRightsP1:
        'Nothing in our Terms is intended to confer on any third party any benefit or any right (under the Contracts (Rights of Third Parties) Act 1999 UK or otherwise) to enforce any provision of our Terms or any agreement entered into in connection with it.',

      // Indemnification
      indemnificationHeader: 'Indemnification',
      indemnificationP1:
        "You agree to indemnify and hold harmless Learning Equality, its contractors, and its licensors, and their respective directors, officers, employees, and agents from and against any and all losses, liabilities, demands, damages, costs, claims, and expenses, including attorneys' fees, arising out of or related to your use of the Service, including but not limited to your violation of the Agreement, Content that you upload or author, and any other activities conducted using the Service.",

      // Miscellaneous
      miscellaneousHeader: 'Miscellaneous',
      miscellaneousP1:
        "The Agreement constitutes the entire agreement between Learning Equality and you concerning the subject matter hereof. If any part of the Agreement is held invalid or unenforceable, that part will be construed to reflect the parties' original intent, and the remaining portions will remain in full force and effect. A waiver by either party of any term or condition of the Agreement or any breach thereof, in any one instance, will not waive such term or condition or any subsequent breach thereof.",
      miscellaneousP2:
        'You may assign your rights under the Agreement to any party that consents to, and agrees to be bound by, its terms and conditions; Learning Equality may assign its rights under the Agreement without condition. The Agreement will be binding upon and will inure to the benefit of the parties, their successors and permitted assigns.',
      miscellaneousP3:
        'If you have any questions about the Service or these Terms, please contact us at legal@learningequality.org.',
    },
  };

</script>


<style scoped>

  .emphasis {
    font-weight: bold;
    text-transform: uppercase;
  }

  .tos-wrapper {
    counter-reset: section;
  }

  .section {
    margin-bottom: 24px;
  }

  h2::before {
    content: counter(section) '. ';
    counter-increment: section;
  }

  ul {
    margin-bottom: 16px;
  }

  li {
    margin: 0 24px;
  }

  .toc li {
    margin-bottom: 8px;
  }

</style>
