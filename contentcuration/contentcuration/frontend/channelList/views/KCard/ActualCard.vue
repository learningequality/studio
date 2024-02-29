<template>

  <div
    class="card"
    tabindex="0"
    @focus="cardFocus"
    @hover="cardHover"
  >
    <BaseCard
      :title="title"
      :headingLevel="headingLevel"
      :to="to"
    />
    <slot></slot>
  </div>

</template>


<script>
  import BaseCard from './BaseCard';

  export default {
    name: 'ActualCard',
    components: {
      BaseCard,
    },
    props: {
      title: {
        type: String,
        required: false,
        default: null,
      },
      headingLevel: {
        type: Number,
        required: true,
        validator(value) {
          if (value == null) {
            console.error(`Missing headinglevel ${value}`);
            return false;
          } else {
            const headingLevelRange = [2, 3, 4, 5, 6];
            if (!headingLevelRange.includes(value)) {
              console.error(`Headinglevel ${value} is not in range 2-6`);
              return false;
            } else {
              return true;
            }
          }
        },
      },
      to: {
        type: Object,
        required: true,
      },
    },
    methods: {
      cardFocus(e) {
        this.$emit('focus', e);
      },
      cardHover(e) {
        this.$emit('hover', e);
      },
    },
  };
</script>
