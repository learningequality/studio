<template>
  <div
    :class="$computedClass({ ':focus': $coreOutline })"
  >
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
          <a :href="to">
            <KTextTruncator
              v-if="title !== null"
              :text="title"
              :maxLines="1"
            />
          </a>
        </component>
      </li>

      <slot></slot>
    </div>
  </div>

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
        },
        computed:{
          headerLevel(){
            return 'h' + this.headingLevel;
          }
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
        margin-bottom: 24px;
        text-align: left;
        text-decoration: none;
        cursor: pointer;
        border-radius: 0.5em;
        transition: box-shadow $core-time ease;
    
        &:hover,
        &:focus {
          @extend %dropshadow-8dp;
        }
      }
    
      .remove-list-style {
        list-style-type: none;
      }
    
    </style>