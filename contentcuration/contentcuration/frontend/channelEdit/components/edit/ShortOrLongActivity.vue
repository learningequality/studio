<template>

  <VFlex>
    <VLayout row wrap justify-space-between>
      <VFlex md2 sm3>
        <VTextField
          v-model="minutes"
          box
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex md9 sm8>
        <VSlider
          v-model="minutes"
          :label="label"
          :max="maxRange"
          :min="shortActivity ? 0 : 31"
        />
      </VFlex>
    </VLayout>
    <VLayout row wrap>
      <VFlex>
        {{ $tr('optionalLabel') }}
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
      value: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        label: '',
        shortMinutes: this.value || 10,
        longMinutes: this.value || 45,
      };
    },
    computed: {
      minutes: {
        get() {
          return this.shortActivity ? this.shortMinutes : this.longMinutes;
        },
        set(value) {
          if (this.shortActivity) {
            this.shortMinutes = value;
          } else {
            this.longMinutes = value;
          }
          this.$emit('input', value);
        },
      },
      maxRange() {
        return this.shortActivity ? 30 : 120;
      },
    },
    $trs: {
      minutesRequired: 'Minutes',
      optionalLabel:
        '(Optional) Duration until resource is marked as complete. This value will not be shown to learners.',
    },
  };

</script>
<style lang="scss">

</style>
