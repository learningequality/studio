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

const SHORT_MIN = 1;
const SHORT_MAX = 30;
const LONG_MIN = 31;
const LONG_MAX = 120;
const EXACT_MIN = 1;
const EXACT_MAX = 1200;

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
      defaultUploadTime: this.duration || 72,
    };
  },
  computed: {
    showRequiredLabel() {
      console.log('here')
      if (this.selectedDuration !== 'exactTime' && this.selectedCompletion === 'completeDuration'){
        console.log('here')
        return true;
      }
      return false;
    },
    showOptionalLabel() {
      console.log('here')
      return this.selectedDuration !== 'exactTime'
    },
    increments() {
      return this.selectedDuration === 'shortActivity' ? 5 : 10;
    },
    availableNumbers() {
      if (this.selectedDuration === 'shortActivity') {
        return [5, 10, 15, 20, 25, 30];
      }
      return [40, 50, 60, 70, 80, 90, 100, 110, 120];
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
      if (this.selectedDuration === 'shortActivity') {
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
      } else if (this.selectedDuration === 'longActivity') {
        return LONG_MIN;
      } else {
        return EXACT_MIN;
      }
    },
    minutesRules() {
      //TODO: handle translation and move to central location
      if (this.selectedDuration === 'shortActivity') {
        return [
          (v) => v !== '' || 'This field is required',
          (v) => v >= SHORT_MIN || 'Short activity must be greater than or equal to 1',
          (v) => v <= SHORT_MAX || 'Short activity must be less than or equal to 30',
        ];
      } else if (this.selectedDuration === 'longActivity') {
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
      if (this.selectedDuration === 'exactTime') {
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
