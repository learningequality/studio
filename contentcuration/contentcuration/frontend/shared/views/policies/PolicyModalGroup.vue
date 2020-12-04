<template>

  <div style="position: absolute;">
    <TermsOfServiceModal
      :value="showTermsOfService"
      :requirePolicyAcceptance="requirePolicyAcceptance"
      @input="handlePolicyChange"
    />
    <PrivacyPolicyModal
      :value="showPrivacyPolicy"
      :requirePolicyAcceptance="requirePolicyAcceptance"
      @input="handlePolicyChange"
    />
  </div>

</template>
<script>

  import PrivacyPolicyModal from './PrivacyPolicyModal';
  import TermsOfServiceModal from './TermsOfServiceModal';
  import { policies } from 'shared/constants';
  import {objectValuesValidator} from "shared/utils/helpers";

  export default {
    name: 'PolicyModalGroup',
    components: {
      PrivacyPolicyModal,
      TermsOfServiceModal,
    },
    model: {
      prop: 'showPolicy',
      event: 'policyChange',
    },
    props: {
      showPolicy: {
        type: String,
        validator: objectValuesValidator(policies),
      },
      requirePolicyAcceptance: {
        type: Boolean,
        default: false,
      }
    },
    computed: {
      showTermsOfService() {
        return this.showPolicy === policies.TERMS_OF_SERVICE;
      },
      showPrivacyPolicy() {
        return this.showPolicy === policies.PRIVACY;
      },
    },
    methods: {
      handlePolicyChange(policy) {
        this.$emit('policyChange', policy);
      },
    }
  };

</script>
