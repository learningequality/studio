<template>

  <VFlex>
    <VLayout row wrap>
      <VFlex v-if="!audioVideoUpload" md2 sm3>
        <VTextField
          v-model.number="minutes"
          box
          min="0"
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex v-else md2 sm3>
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
      value: {
        type: Number,
        default: 0,
      },
      duration: {
        type: Number,
        default: null,
      },
    },
    data() {
      return {
        defaultUploadTime: this.duration || 12,
      };
    },
    computed: {
      minutes: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
    },
    $trs: {
      minutesRequired: 'Minutes',
    },
  };

</script>
<style lang="scss">

</style>
