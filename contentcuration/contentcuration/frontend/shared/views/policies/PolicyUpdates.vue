<template>

  <div style="position: absolute;">
    <PolicyModalGroup
      v-if="showPolicy"
      :showPolicy="showPolicy"
      requirePolicyAcceptance
      @policyChange="handlePolicyChange"
    />
  </div>

</template>
<script>

  import { mapGetters } from 'vuex';
  import PolicyModalGroup from './PolicyModalGroup';
  import { policies } from 'shared/constants';

  export default {
    name: 'PolicyUpdates',
    components: {
      PolicyModalGroup,
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
      showPolicy() {
        if (this.showTermsOfService) {
          return policies.TERMS_OF_SERVICE;
        } else if (this.showPrivacyPolicy) {
          return policies.PRIVACY;
        }
        return null;
      },
    },
    mounted() {
      if (this.loggedIn) {
        this.showTermsOfService = this.nonAcceptedPolicies.includes(policies.TERMS_OF_SERVICE);
        this.showPrivacyPolicy = this.nonAcceptedPolicies.includes(policies.PRIVACY);
      }
    },
    methods: {
      handlePolicyChange(policypolicy) {
        if (policy) {

        }
        else if (this.showTermsOfService) {
          this.showTermsOfService = false;
        } else if (this.showPrivacyPolicy) {
          this.showPrivacyPolicy = false;
        }
      },
    },
  };

</script>
