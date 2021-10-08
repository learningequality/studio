<template>

  <VFlex md6>
    <VLayout row justify-space-between>
      <VFlex md3>
        <VTextField
          v-model="computedMinutes"
          box
          :label="$tr('minutesRequired')"
        />
      </VFlex>
      <VFlex md8>
        <VSlider
          v-model="computedMinutes"
          :label="label"
          :max="maxRange"
        />
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
    },
    data() {
      return {
        label: '',
        shortMinutes: 10,
        longMinutes: 45,
      };
    },
    computed: {
      computedMinutes: {
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
    },
  };

</script>
<style lang="scss">

</style>
