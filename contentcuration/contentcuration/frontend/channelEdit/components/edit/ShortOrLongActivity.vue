<template>

  <div>
    <VLayout row justify-space-between>
      <VFlex md3>
        <VTextField
          v-model="minutes"
          box
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex md8>
        <VSlider
          v-model="value"
          :label="label"
          :track-color="color"
          :max="max"
        />
      </VFlex>
    </VLayout>
    {{ $tr('optional') }}
  </div>

</template>

<script>

  export default {
    name: 'ShortOrLongActivity',
    props: {
      // levels: {
      //   type: Array,
      //   required: true,
      // },
    },
    data() {
      return {
        minutes: 10,
        label: '',
        value: 10,
        color: 'green lighten-1',
        max: 100,
      };
    },
    $trs: {
      minutesRequired: 'Minutes',
      optional: '(Optional) Duration until resource is marked as complete. This value will not be shown to learners.',
    },
  };

</script>
<style lang="scss">

</style>
