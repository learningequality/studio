<template>

  <VFlex>
    <VLayout row wrap>
      <VFlex v-if="!audioVideoUpload" md3>
        <VTextField
          v-model="minutes"
          box
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex v-else md6>
        {{ defaultUploadTime }}
      </VFlex>
    </VLayout>
  </VFlex>

</template>

<script>

  export default {
    name: 'ExactTimeToCompleteActivity',
    props: {
      audioVideoUpload: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        minutes: '',
        defaultUploadTime: '13:24',
      };
    },
    computed: {},
    $trs: {
      minutesRequired: 'Minutes',
    },
  };

</script>
<style lang="scss">

</style>
