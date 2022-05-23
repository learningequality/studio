<template>

  <VFlex>
    <VLayout row wrap justify-space-between>
      <VFlex v-if="audioVideoUpload && durationValue === 'exactTime'" md2 sm3>
        {{ defaultUploadTime }}
      </VFlex>
      <VFlex v-else md2 sm3>
        <VTextField
          v-model="minutes"
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
      <VFlex v-if="durationValue !== 'exactTime'">
        {{ $tr('optionalLabel') }}
      </VFlex>
    </VLayout>
  </VFlex>

</template>

<script>

  import debounce from 'lodash/debounce';

  const SHORT_MIN = 1;
  const SHORT_MAX = 30;
  const LONG_MIN = 31;
  const LONG_MAX = 120;
  const EXACT_MIN = 1;
  const EXACT_MAX = 1200;

  export default {
    name: 'ActivityDuration',
    props: {
      durationValue: {
        type: String,
        default: '',
      },
      value: {
        type: Number,
        default: 0,
      },
      audioVideoUpload: {
        type: Boolean,
        default: false,
      },
      duration: {
        type: Number,
        default: null,
      },
    },
    data() {
      return {
        defaultUploadTime: this.duration || 72,
      };
    },
    computed: {
      minutes: {
        get() {
          if (!this.value) {
            return '';
          }
          return this.convertToMinutes(this.value);
        },
        set(value) {
          this.handleValidateMinutes(value);
        },
      },
      maxRange() {
        if (this.durationValue === 'shortActivity') {
          return SHORT_MAX;
        } else if (this.durationValue === 'longActivity') {
          return LONG_MAX;
        } else {
          return EXACT_MAX;
        }
      },
      minRange() {
        if (this.durationValue === 'shortActvity') {
          return SHORT_MIN;
        } else if (this.durationValue === 'longActivity') {
          return LONG_MIN;
        } else {
          return EXACT_MIN;
        }
      },
      minutesRules() {
        //TODO: handle translation and move to central location
        if (this.durationValue === 'shortActivity') {
          return [
            v => v !== '' || 'This field is required',
            v => v >= SHORT_MIN || 'Short activity must be greater than or equal to 1',
            v => v <= SHORT_MAX || 'Short activity must be less than or equal to 30',
          ];
        } else if (this.durationValue === 'longActivity') {
          return [
            v => v !== '' || 'This field is required',
            v => v >= LONG_MIN || 'Long activity must be greater than or equal to 31',
            v => v <= LONG_MAX || 'Long activity must be less than or equal to 120',
          ];
        }
        return [
          v => v !== '' || 'This field is required',
          v => v >= EXACT_MIN || 'Time must be greater than or equal to 1',
          v => v <= EXACT_MAX || 'Time must be less than or equal to 1200',
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
