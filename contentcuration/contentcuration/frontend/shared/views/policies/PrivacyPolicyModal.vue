<template>

  <PoliciesModal
    v-model="dialog"
    :requirePolicyAcceptance="requirePolicyAcceptance"
    :header="$tr('header')"
  >
    <p class="body-1 mt-2">
      {{ $tr('lastUpdated', {date:$formatDate(date)}) }}
    </p>
    <p>{{ $tr('paragraph1') }}</p>
    <p>{{ $tr('paragraph2') }}</p>
    <p>{{ $tr('paragraph3') }}</p>
    <p>
      <ActionLink
        :text="$tr(&quot;linkText&quot;)"
        target="_blank"
        href="https://learningequality.org/about/values/"
      />
    </p>
    <p>{{ $tr('paragraph4') }}</p>
  </PoliciesModal>

</template>
<script>

  import PoliciesModal from './PoliciesModal';
  import { policies, policyDates } from 'shared/constants';

  export default {
    name: 'PrivacyPolicyModal',
    components: {
      PoliciesModal,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      requirePolicyAcceptance: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      date() {
        return policyDates[policies.PRIVACY];
      },
    },
    $trs: {
      header: 'Privacy policy',
      lastUpdated: 'Last updated {date}',
      paragraph1:
        'This Privacy Policy informs you of our privacy practices and your choices and rights around the personal data that we collect. This Privacy Policy applies to the Kolibri application ("Application"), Kolibri Studio ("Studio"), and all related websites (herein collectively referred to as "Kolibri"). This Privacy Statement does not apply to third party applications or partner organizations that may use our software or be used in conjunction with our software.',
      paragraph2:
        'Learning Equality recognizes your right to privacy, and will take reasonable steps to protect this. Some parts of Kolibri allow you to give us personal information, such as your name and email address. We may use the information you provide to improve Kolibri. Where you have choices about how we use the information you provide, we will indicate this at the point of collection. Because of the way Kolibri operates, we may also use information from your browser or browsing activities to personalize or route you to relevant information. For example, we may use your IP address, browser information, cookies or web beacons in ways that help us maintain some of your preferences, or understand how our visitors navigate the site so we can improve it. We may store your personal information outside of the European Union.',
      paragraph3:
        'Learning Equality is committed to learning constantly and improving the quality of Kolibri, and records related to your interactions with Kolibri may be used for research. Research findings will typically be reported at the aggregate level, and your personal identity will never be publicly disclosed in any research findings without your express consent.',
      linkText: "Learn more about Learning Equality's core values.",
      paragraph4:
        'If you have any questions about these practices or use of your personal information, please email legal@learningequality.org.',
    },
  };

</script>
