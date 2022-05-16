<template>
  <VFlex>
    <VLayout row wrap justify-space-between>
      <VFlex md2 sm3>
        <VTextField v-model.number="shortLongActivityMinutes" box :label="$tr('minutesRequired')" />
      </VFlex>
      <VFlex md9 sm8>
        <VSlider
          v-model="shortLongActivityMinutes"
          :label="label"
          :max="maxRange"
          :min="shortActivity ? 0 : 30"
          :step="shortActivity ? 5 : 10"
          ticks="always"
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
const SLIDER_MIDPOINT = 1800;
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
      default: this.shortActivity ? 10 : 50,
    };
  },
  computed: {
    shortLongActivityMinutes: {
      get() {
        if (this.shortActivity) {
          return this.value > SLIDER_MIDPOINT ? this.default : this.secondsToMinutes(this.value);
        } else {
          return this.value < SLIDER_MIDPOINT ? this.default : this.secondsToMinutes(this.value);
        }
      },
      set(value) {
        this.$emit('input', value);
      },
    },
    maxRange() {
      return this.shortActivity ? 30 : 120;
    },
  },
  methods: {
    secondsToMinutes(seconds) {
      return Math.floor(seconds / 60);
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
