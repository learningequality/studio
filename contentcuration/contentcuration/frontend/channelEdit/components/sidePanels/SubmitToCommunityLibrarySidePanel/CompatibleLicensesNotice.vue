<template>

  <Box
    kind="success"
    data-test="compatible-licenses-notice"
  >
    <template #title>
      {{ licenseCheckPassed$() }}
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
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  export default {
    name: 'CompatibleLicensesNotice',
    components: {
      Box,
    },
    setup(props) {
      const { licenseCheckPassed$, compatibleLicensesDescription$ } = communityChannelsStrings;
      const includedLicenseNames = computed(() => {
        return formatLicenseNames(props.licenses, {
          excludes: ['Special Permissions'],
        });
      });

      const descriptionText = computed(() => {
        return compatibleLicensesDescription$({
          licenseNames: includedLicenseNames.value,
        });
      });

      return {
        licenseCheckPassed$,
        descriptionText,
      };
    },
    props: {
      licenses: {
        type: Array,
        required: false,
        default: () => [],
      },
    },
  };

</script>
