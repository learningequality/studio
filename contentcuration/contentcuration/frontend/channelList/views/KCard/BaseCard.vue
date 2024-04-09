<template>

  <li
    :class="['remove-list-style card',$computedClass(coreOutlineFocus)]"
    tabindex="0"
    data-focus="true"
    @focus="cardFocus"
    @hover="cardHover"
  >
    <component
      :is="headerLevel"
    >
      <KRouterLink
        :to="to"
        class="spacing"
      >
        <KTextTruncator
          v-if="title !== null"
          :text="title"
          :maxLines="titleLines"
          class="spacing"
        />
      </KRouterLink>
    </component>
    <slot name="default"></slot>
  </li>

</template>


<script>

  export default {
    name: 'BaseCard',
    props: {
      title: {
        type: String,
        required: false,
        default: null,
      },
      headingLevel: {
        type: Number,
        required: true,
      },
      titleLines: {
        type: Number,
        required: false,
        default: 2,
      },
      to: {
        type: Object,
        required: true,
      },
    },
    computed: {
      headerLevel() {
        return 'h' + this.headingLevel;
      },
      coreOutlineFocus() {
        return {
          ':focus': {
            ...this.$coreOutline,
          },
        };
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


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .card {
    @extend %dropshadow-2dp;

    position: relative;
    display: block;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    border-radius: 0.5em;
    outline-offset: -1px;
    transition: border-color $core-time ease;

    &:hover,
    &:focus {
      @extend %dropshadow-8dp;
    }
  }

  .remove-list-style {
    list-style-type: none;
  }

  .spacing {
    padding: 1em;
    color: black;
  }

</style>
