<template>

  <Box
    :kind="boxKind"
    :loading="isLoading"
    data-test="license-status"
  >
    <template #title>
      {{ titleText }}
    </template>
    <template #description>
      {{ descriptionText }}
    </template>
  </Box>

</template>


<script>

  import { computed } from 'vue';
  import Box from './Box.vue';
  import { useLicenseNames } from './composables/useLicenseNames';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  const {
    licenseCheckPassed$,
    allLicensesCompatible$,
    incompatibleLicensesDetected$,
    channelCannotBeDistributed$,
    fixLicensingBeforeSubmission$,
  } = communityChannelsStrings;

  export default {
    name: 'LicenseStatus',
    components: {
      Box,
    },
    setup(props) {
      const invalidLicenseIds = computed(() => {
        if (!props.invalidLicenses || props.invalidLicenses.length === 0) {
          return [];
        }
        return props.invalidLicenses;
      });

      const includedLicenseIds = computed(() => {
        if (!props.includedLicenses || props.includedLicenses.length === 0) {
          return [];
        }
        return props.includedLicenses;
      });

      const { formattedLicenseNames: invalidLicenseNames, isLoading: isLoadingInvalid } =
        useLicenseNames(invalidLicenseIds);

      const { formattedLicenseNames: includedLicenseNames, isLoading: isLoadingIncluded } =
        useLicenseNames(includedLicenseIds);

      const isLoading = computed(() => isLoadingInvalid.value || isLoadingIncluded.value);

      const hasInvalidLicenses = computed(() => {
        return invalidLicenseIds.value.length > 0;
      });

      const boxKind = computed(() => {
        return hasInvalidLicenses.value ? 'warning' : 'success';
      });

      const titleText = computed(() => {
        if (hasInvalidLicenses.value) {
          return incompatibleLicensesDetected$();
        }
        return licenseCheckPassed$();
      });

      const descriptionText = computed(() => {
        if (hasInvalidLicenses.value) {
          const licenseText = invalidLicenseNames.value ? `"${invalidLicenseNames.value}" - ` : '';
          return `${licenseText}${channelCannotBeDistributed$()} ${fixLicensingBeforeSubmission$()}`;
        }

        const licenseText = includedLicenseNames.value || '';
        const suffix = allLicensesCompatible$();
        return licenseText ? `${licenseText} - ${suffix}` : suffix;
      });

      return {
        boxKind,
        titleText,
        descriptionText,
        isLoading,
      };
    },
    props: {
      invalidLicenses: {
        type: Array,
        required: false,
        default: null,
      },
      includedLicenses: {
        type: Array,
        required: false,
        default: null,
      },
    },
  };

</script>
