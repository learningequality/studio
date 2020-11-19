<template>

  <div style="position: absolute;">
    <TermsOfServiceModal
      v-model="showTermsOfService"
      requirePolicyAcceptance
    />
    <PrivacyPolicyModal
      :value="!showTermsOfService && showPrivacyPolicy"
      requirePolicyAcceptance
      @input="v => showPrivacyPolicy = v"
    />
  </div>

</template>
<script>

  import { mapGetters } from 'vuex';
  import PrivacyPolicyModal from './PrivacyPolicyModal';
  import TermsOfServiceModal from './TermsOfServiceModal';
  import { policies } from 'shared/constants';

  export default {
    name: 'PolicyUpdates',
    components: {
      PrivacyPolicyModal,
      TermsOfServiceModal,
    },
    data() {
      return {
        showPrivacyPolicy: false,
        showTermsOfService: false,
      };
    },
    computed: {
      ...mapGetters(['loggedIn']),
      ...mapGetters('policies', ['getNonAcceptedPolicies']),
      nonAcceptedPolicies() {
        return this.getNonAcceptedPolicies(window.user.policies);
      },
    },
    mounted() {
      if (this.loggedIn) {
        this.showTermsOfService = this.nonAcceptedPolicies.includes(policies.TERMS_OF_SERVICE);
        this.showPrivacyPolicy = this.nonAcceptedPolicies.includes(policies.PRIVACY);
      }
    },
    $trs: {},
  };

</script>
