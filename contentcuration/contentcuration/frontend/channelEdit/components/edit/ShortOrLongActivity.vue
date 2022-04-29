<template>

  <VFlex>
    <VLayout row wrap justify-space-between>
      <VFlex md2 sm3>
        <VTextField
          v-model.number="shortLongActivityMinutes"
          box
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex md9 sm8>
        <VSlider
          v-model="shortLongActivityMinutes"
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
      // value: {
      //   type: Number,
      //   default: 0,
      // },
    },
    data() {
      return {
        label: '',
        shortMinutes: 10,
        longMinutes: 45,
      };
    },
    computed: {
      shortLongActivityMinutes: {
        get() {
          // return this.value;
          return this.shortActivity ? this.shortMinutes : this.longMinutes;
        },
        set(value) {
          if (this.shortActivity) {
            this.shortMinutes = value < this.maxRange ? value : this.maxRange;
          } else {
            this.longMinutes = value > 31 ? value : 31;
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
