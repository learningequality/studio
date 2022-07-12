<template>
  <VFlex>
    <VLayout row wrap justify-space-between>
      <VFlex v-if="audioVideoUpload && selectedDuration === 'exactTime'" md2 sm3>
        {{ defaultUploadTime }}
      </VFlex>
      <VFlex
        v-else-if="selectedDuration === 'shortActivity' || selectedDuration === 'longActivity'"
        md3
        sm3
      >
        <VAutocomplete
          v-model="minutes"
          type="number"
          :step="increments"
          box
          :label="$tr('minutesRequired')"
          :items="availableNumbers"
        />
      </VFlex>
      <VFlex v-else md3 sm3>
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
      <VFlex v-if="showRequiredLabel">
        {{ $tr('notOptionalLabel') }}
      </VFlex>
      <VFlex v-else-if="showOptionalLabel">
        {{ $tr('optionalLabel') }}
      </VFlex>
    </VLayout>
  </VFlex>
</template>

<script>
import debounce from 'lodash/debounce';
import { CompletionDropdownMap, DurationDropdownMap } from 'shared/constants';

const SHORT_MIN = 1;
const SHORT_MAX = 30;
const LONG_MIN = 31;
const LONG_MAX = 120;
const EXACT_MIN = 1;
const EXACT_MAX = 1200;
const SHORT_ACTIVITY_RANGE = [5, 10, 15, 20, 25, 30];
const LONG_ACTIVITY_RANGE = [40, 50, 60, 70, 80, 90, 100, 110, 120];

export default {
  name: 'ActivityDuration',
  props: {
    selectedDuration: {
      type: String,
      default: '',
    },
    selectedCompletion: {
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
      defaultUploadTime: this.duration || `17:12`,
    };
  },
  computed: {
    showRequiredLabel() {
      return (
        this.selectedDuration !== DurationDropdownMap.EXACT_TIME &&
        this.selectedCompletion === CompletionDropdownMap.completeDuration
      );
    },
    showOptionalLabel() {
      return this.selectedDuration !== DurationDropdownMap.EXACT_TIME;
    },
    increments() {
      return this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY ? 5 : 10;
    },
    availableNumbers() {
      return this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY
        ? SHORT_ACTIVITY_RANGE
        : LONG_ACTIVITY_RANGE;
    },
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
      if (this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY) {
        return SHORT_MAX;
      } else if (this.selectedDuration === 'longActivity') {
        return LONG_MAX;
      } else {
        return EXACT_MAX;
      }
    },
    minRange() {
      if (this.selectedDuration === 'shortActvity') {
        return SHORT_MIN;
      } else if (this.selectedDuration === DurationDropdownMap.LONG_ACTIVITY) {
        return LONG_MIN;
      } else {
        return EXACT_MIN;
      }
    },
    minutesRules() {
      //TODO: handle translation and move to central location
      if (this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY) {
        return [
          (v) => v !== '' || 'This field is required',
          (v) => v >= SHORT_MIN || 'Short activity must be greater than or equal to 1',
          (v) => v <= SHORT_MAX || 'Short activity must be less than or equal to 30',
        ];
      } else if (this.selectedDuration === DurationDropdownMap.LONG_ACTIVITY) {
        return [
          (v) => v !== '' || 'This field is required',
          (v) => v >= LONG_MIN || 'Long activity must be greater than or equal to 31',
          (v) => v <= LONG_MAX || 'Long activity must be less than or equal to 120',
        ];
      }
      return [
        (v) => v !== '' || 'This field is required',
        (v) => v >= EXACT_MIN || 'Time must be greater than or equal to 1',
        (v) =>
          v <= EXACT_MAX ||
          'Please make sure this is the amount of time you want learners to spend on this resource to complete it',
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
      if (this.selectedDuration === DurationDropdownMap.EXACT_TIME) {
        this.$emit('input', value * 60);
      } else {
        if (value >= this.minRange && value <= this.maxRange) {
          this.$emit('input', value * 60);
        }
      }
    },
  },
  $trs: {
    minutesRequired: 'Minutes',
    optionalLabel:
      '(Optional) Duration until resource is marked as complete. This value will not be shown to learners.',
    notOptionalLabel:
      'Duration until resource is marked as complete. This value will not be shown to learners.',
  },
};
</script>
<style lang="scss">
</style>
