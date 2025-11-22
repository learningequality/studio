<template>

  <Box
    :kind="boxKind"
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
  import { formatLicenseNames } from './composables/useLicenseNames';
  import { findLicense } from 'shared/utils/helpers';
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
      const invalidLicenseNames = computed(() => formatLicenseNames(props.invalidLicenses));
      
      const includedLicenseNames = computed(() => {
        if (!props.includedLicenses) return '';

        return props.includedLicenses
          .map(id => {
            const license = findLicense(id);
            return license.license_name;
          })
          .filter(name => name !== 'Special Permissions')
          .join(', ');
      });

      const hasInvalidLicenses = computed(() => {
        return props.invalidLicenses && props.invalidLicenses.length > 0;
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
          return `"${invalidLicenseNames.value}" - ${channelCannotBeDistributed$()} ${fixLicensingBeforeSubmission$()}`;
        }

        return `${includedLicenseNames.value} - ${allLicensesCompatible$()}`;
      });

      return {
        boxKind,
        titleText,
        descriptionText,
      };
    },
    props: {
      invalidLicenses: {
        type: Array,
        required: false,
        default: () => [],
      },
      includedLicenses: {
        type: Array,
        required: false,
        default: () => [],
      },
    },
  };

</script>
