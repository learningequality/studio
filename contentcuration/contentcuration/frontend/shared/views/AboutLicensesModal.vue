<template>

  <KModal
    :title="$tr('licenseInfoHeader')"
    :cancelText="$tr('close')"
    @cancel="closeModal()"
  >
    <div v-for="(license, index) in licences" :key="index" class="mb-4 mt-3">
      <h2 class="font-weight-bold mb-1 subheading">
        {{ license.name }}
      </h2>
      <p class="body-1 grey--text mb-1">
        {{ license.description }}
      </p>
      <p v-if="license.license_url">
        <ActionLink
          :href="getLicenseUrl(license)"
          target="_blank"
          :text="$tr('learnMoreButton')"
        />
      </p>
    </div>
  </KModal>

</template>

<script>

  import { mapMutations } from 'vuex';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { LicensesList } from 'shared/leUtils/Licenses';

  export default {
    name: 'AboutLicensesModal',
    mixins: [constantsTranslationMixin],
    computed: {
      licences() {
        return LicensesList.filter(license => license.id).map(license => ({
          ...license,
          name: this.translateConstant(license.license_name),
          description: this.translateConstant(license.license_name + '_description'),
        }));
      },
    },
    methods: {
      ...mapMutations({
        closeModal: 'SET_SHOW_ABOUT_LICENSES',
      }),
      getLicenseUrl(license) {
        const isCC = license.license_url.includes('creativecommons.org');
        const language = window.languageCode || 'en';
        return isCC ? `${license.license_url}deed.${language}` : license.license_url;
      },
    },
    $trs: {
      close: 'Close',
      learnMoreButton: 'Learn More',
      licenseInfoHeader: 'About licenses',
    },
  };

</script>