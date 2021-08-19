<template>

  <div>
    <VLayout row>
      <VFlex v-if="!audioVideoUpload" md6>
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

  </div>

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
