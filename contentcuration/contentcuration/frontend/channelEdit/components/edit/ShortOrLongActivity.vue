<template>

  <div>
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
    <!-- This may be moved back into CompletionOptions -->
    {{ $tr('optional') }}
  </div>

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
        // color: 'green lighten-1',
        shortMinutes: 10,
        longMinutes: 45,
      };
    },
    computed: {
    },
    $trs: {
      minutesRequired: 'Minutes',
      optional:
        '(Optional) Duration until resource is marked as complete. This value will not be shown to learners.',
    },
  };

</script>
<style lang="scss">

</style>
