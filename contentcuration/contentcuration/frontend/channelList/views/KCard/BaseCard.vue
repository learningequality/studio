<template>

  <button>
    <div
      class="card"
      tabindex="0"
      @focus="cardFocus"
      @hover="cardHover"
    >

      <li class="remove-list-style">
        <component
          :is="headerLevel"
        >
          <KRouterLink
            :to="to"
          >

            <KTextTruncator
              v-if="title !== null"
              :text="title"
              :maxLines="titleLines"
              class="spacing"
            />
          </KRouterLink>
        </component>
      </li>

      <slot name="default"></slot>


    </div>
  </button>

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
      to: {
        type: Object,
        required: true,
      },
      titleLines: {
        type: Number,
        required: true,
        default: 2,
      },
    },
    computed: {
      headerLevel() {
        return 'h' + this.headingLevel;
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


<style lang="scss">

  @import './definitions';

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
