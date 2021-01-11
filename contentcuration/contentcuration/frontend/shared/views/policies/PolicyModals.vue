<template>

  <div style="position: absolute;">
    <TermsOfServiceModal />
    <PrivacyPolicyModal />
    <CommunityStandardsModal />
  </div>

</template>
<script>

  import PrivacyPolicyModal from './PrivacyPolicyModal';
  import TermsOfServiceModal from './TermsOfServiceModal';
  import CommunityStandardsModal from './CommunityStandardsModal';

  export default {
    name: 'PolicyModals',
    components: {
      CommunityStandardsModal,
      PrivacyPolicyModal,
      TermsOfServiceModal,
    },
  };

</script>
