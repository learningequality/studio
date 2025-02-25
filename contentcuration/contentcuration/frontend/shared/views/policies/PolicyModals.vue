<template>

  <div style="position: absolute; width: 0; height: 0">
    <TermsOfServiceModal
      v-if="showTermsOfService"
      :needsAcceptance="isPolicyUnaccepted(policies.TERMS_OF_SERVICE)"
      @accept="handleAcceptPolicy"
      @open="openPolicy"
      @close="closePolicy"
    />
    <PrivacyPolicyModal
      v-if="showPrivacyPolicy"
      :needsAcceptance="isPolicyUnaccepted(policies.PRIVACY)"
      @accept="handleAcceptPolicy"
      @open="openPolicy"
      @close="closePolicy"
    />
    <CommunityStandardsModal
      v-if="showCommunityStandards"
      :needsAcceptance="false"
      @close="closePolicy"
    />
  </div>

</template>


<script>

  import get from 'lodash/get';
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
      return { policies };
    },
    computed: {
      ...mapGetters('policies', [
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
      selectedPolicy() {
        // Effectively results in watching the route query
        return get(this, '$route.query.showPolicy', this.firstUnacceptedPolicy);
      },
    },
    methods: {
      ...mapActions('policies', ['acceptPolicy']),
      openPolicy(policy) {
        const toRoute = this.$route;
        toRoute.query.showPolicy = policy;
        this.$router.push(toRoute);
      },
      closePolicy() {
        this.$router.push({ query: {} });
      },
      handleAcceptPolicy(policy) {
        this.acceptPolicy(this.getPolicyAcceptedData(policy)).then(this.closePolicy);
      },
    },
  };

</script>
