<template>

  <div style="position: absolute; width: 0; height: 0">
    <TermsOfServiceModal
      v-if="showTermsOfService"
      :needsAcceptance="isPolicyUnaccepted(policies.TERMS_OF_SERVICE)"
      @accept="acceptPolicy(getPolicyAcceptedData(policies.TERMS_OF_SERVICE))"
      @close="closePolicy(policies.TERMS_OF_SERVICE)"
      @open="policy => openPolicy(policy)"
    />
    <PrivacyPolicyModal
      v-if="showPrivacyPolicy"
      :needsAcceptance="isPolicyUnaccepted(policies.PRIVACY)"
      @accept="acceptPolicy(getPolicyAcceptedData(policies.PRIVACY))"
      @close="closePolicy(policies.PRIVACY)"
      @open="policy => openPolicy(policy)"
    />
    <CommunityStandardsModal
      v-if="showCommunityStandards"
      :needsAcceptance="false"
      @close="closePolicy(policies.COMMUNITY_STANDARDS)"
    />
  </div>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import PrivacyPolicyModal from './PrivacyPolicyModal';
  import TermsOfServiceModal from './TermsOfServiceModal';
  import CommunityStandardsModal from './CommunityStandardsModal';
  import { policies } from 'shared/constants';

  export default {
    name: 'PolicyModals',
    components: {
      CommunityStandardsModal,
      PrivacyPolicyModal,
      TermsOfServiceModal,
    },
    data() {
      return {
        policies,
      };
    },
    computed: {
      ...mapGetters('policies', [
        'selectedPolicy',
        'getPolicyAcceptedData',
        'isPolicyUnaccepted',
        'firstUnacceptedPolicy',
      ]),
      showTermsOfService() {
        return (
          this.selectedPolicy === policies.TERMS_OF_SERVICE ||
          (!this.selectedPolicy && this.firstUnacceptedPolicy === policies.TERMS_OF_SERVICE)
        );
      },
      showPrivacyPolicy() {
        return (
          this.selectedPolicy === policies.PRIVACY ||
          (!this.selectedPolicy && this.firstUnacceptedPolicy === policies.PRIVACY)
        );
      },
      showCommunityStandards() {
        return this.selectedPolicy === policies.COMMUNITY_STANDARDS;
      },
    },
    methods: {
      ...mapActions('policies', ['acceptPolicy', 'openPolicy', 'closePolicy']),
    },
  };

</script>
