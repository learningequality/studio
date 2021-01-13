<template>

  <div style="position: absolute; width: 0; height: 0">
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
