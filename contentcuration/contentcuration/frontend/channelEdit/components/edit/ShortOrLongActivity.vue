<template>

  <div>
    <VLayout :shortActivity="shortActivity" row justify-space-between>
      <VFlex md3>
        <VTextField
          v-model="minutes"
          box
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex md8>
        <VSlider
          v-model="minutes"
          :label="label"
          :max="max"
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
      };
    },
    computed: {
      minutes() {
        //change to getter setter?
        return this.shortActivity ? 10 : 45;
      },
      max() {
        return this.shortActivity ? 30 : 120;
      },
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
