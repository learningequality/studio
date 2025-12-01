<template>

  <Box
    kind="warning"
    data-test="invalid-licenses-notice"
  >
    <template #title>
      {{ incompatibleLicensesDetected$() }}
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
    name: 'InvalidLicensesNotice',
    components: {
      Box,
    },
    setup(props) {
      const { incompatibleLicensesDetected$, incompatibleLicensesDescription$ } =
        communityChannelsStrings;
      const invalidLicenseNames = computed(() => formatLicenseNames(props.invalidLicenses));

      const descriptionText = computed(() => {
        return incompatibleLicensesDescription$({
          licenseNames: invalidLicenseNames.value,
        });
      });

      return {
        incompatibleLicensesDetected$,
        descriptionText,
      };
    },
    props: {
      invalidLicenses: {
        type: Array,
        required: true,
      },
    },
  };

</script>
