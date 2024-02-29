<template>

  <div
    :class="$computedClass({ ':focus': $coreOutline })"
  >
    <li class="remove-list-style">
      <component
        :is="'h' + headingLevel"
        v-if="title !== null"
      >
        <a :href="to">
          <KTextTruncator :text="title" :maxLines="1" />
        </a>
      </component>
    </li>
  </div>

</template>
    
    
    <script>

    import KTextTruncator from 'kolibri-design-system/lib/KTextTruncator';
    
      export default {
        name: 'BaseCard',
        components: {
          KTextTruncator,
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
          },
          to: {
            type: Object,
            required: true,
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
        padding: 16px;
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