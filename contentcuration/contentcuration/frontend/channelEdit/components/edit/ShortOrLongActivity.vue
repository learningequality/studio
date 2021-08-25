<template>

  <VFlex md6>
    <VLayout v-if="shortActivity" row justify-space-between>
      <VFlex md3>
        <VTextField
          v-model="shortMinutes"
          box
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex md8>
        <VSlider
          v-model="shortMinutes"
          :label="label"
          :max="30"
        />
      </VFlex>
    </VLayout>
    <VLayout v-else row justify-space-between>
      <VFlex md3>
        <VTextField
          v-model="longMinutes"
          box
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex md8>
        <VSlider
          v-model="longMinutes"
          :label="label"
          :max="120"
        />
      </VFlex>
    </VLayout>
  </VFlex>

</template>

<script>

  export default {
    name: 'ShortOrLongActivity',
    props: {
      shortActivity: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        label: '',
        shortMinutes: 10,
        longMinutes: 45,
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
