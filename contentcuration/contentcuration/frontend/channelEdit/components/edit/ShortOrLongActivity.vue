<template>

  <VFlex>
    <VLayout row wrap justify-space-between>
      <VFlex md2 sm3>
        <VTextField
          v-model="shortLongActivityMinutes"
          type="number"
          box
          :min="minRange"
          :max="maxRange"
          :label="$tr('minutesRequired')"
          :rules="minutesRules"
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

  import debounce from 'lodash/debounce';

  const SHORT_ACTIVITY_MIN = 0;
  const SHORT_ACTIVITY_MAX = 30;
  const LONG_ACTIVITY_MIN = 31;
  const LONG_ACTIVITY_MAX = 120;

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
    computed: {
      shortLongActivityMinutes: {
        get() {
          return this.convertToMinutes(this.value);
        },
        set(value) {
          this.handleValidateMinutes(value);
        },
      },
      maxRange() {
        return this.shortActivity ? SHORT_ACTIVITY_MAX : LONG_ACTIVITY_MAX;
      },
      minRange() {
        return this.shortActivity ? SHORT_ACTIVITY_MIN : LONG_ACTIVITY_MIN;
      },
      minutesRules() {
        if (this.shortActivity) {
          return [
            v => v !== '' || 'This field is required',
            v => v >= SHORT_ACTIVITY_MIN || 'Short activity must be greater than or equal to 0',
            v => v <= SHORT_ACTIVITY_MAX || 'Short activity be less than or equal to 30',
          ];
        }
        return [
          v => v !== '' || 'This field is required',
          v => v >= LONG_ACTIVITY_MIN || 'Long activity must be greater than or equal to 31',
          v => v <= LONG_ACTIVITY_MAX || 'Long activity be less than or equal to 120',
        ];
      },
    },
    created() {
      this.handleValidateMinutes = debounce(this.validateMinutes, 500);
    },
    methods: {
      convertToMinutes(seconds) {
        return Math.floor(seconds / 60);
      },
      validateMinutes(value) {
        if (value >= this.minRange && value <= this.maxRange) {
          this.$emit('input', value * 60);
        }
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
