<template>

  <div class="accordion">
    <div>
      <KGrid
        :style="{
          backgroundColor: $themeTokens.surface,
        }"
      >
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
        >
          <h3 class="accordion-title">
            <button
              :id="id"
              :aria-expanded="showAccordionItem.toString()"
              :aria-controls="`${id}-content`"
              :class="$computedClass(coreOutlineFocus)"
              @click="openAccordion"
            >
              <slot name="title"></slot>
              <KIcon
                :icon="showAccordionItem ? 'chevronUp' : 'chevronDown'"
                :color="$themePalette.grey.v_400"
                class="accordion-icon"
              />
            </button>
          </h3>
        </KGridItem>
      </KGrid>
    </div>

    <KTransition kind="component-vertical-slide-out-in">
      <div
        v-if="showAccordionItem"
        :id="`${id}-content`"
        role="region"
        :aria-labelledby="id"
        class="accordion-body"
        :style="{
          backgroundColor: $themeTokens.surface,
        }"
      >
        <slot name="body"> </slot>
      </div>
    </KTransition>
    <div
      v-if="!lastItem"
      :style="{
        borderBottom: `1.5px solid ${$themeTokens.fineLine}`,
      }"
    ></div>
  </div>

</template>


<script>

  export default {
    name: 'AccordionContainer',
    props: {
      lastItem: {
        type: Boolean,
        default: false,
      },
      id: {
        type: String,
        default: 'accordion',
      },
    },
    expose: ['openAccordion'],
    data() {
      return {
        showAccordionItem: false,
      };
    },
    computed: {
      coreOutlineFocus() {
        return {
          ':focus': {
            ...this.$coreOutline,
            outlineOffset: '-2px',
          },
        };
      },
    },
    methods: {
      openAccordion() {
        this.showAccordionItem = !this.showAccordionItem;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .accordion-title {
    margin: 0;
    font-weight: 700;
    text-wrap: stable;

    button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 14px 24px;
      line-height: 18px;
      text-align: left;
      text-transform: none;
      text-wrap: stable;
      cursor: pointer;
      background: transparent;
      border: 0;
    }
  }

  .accordion-body {
    padding: 16px;
    font-size: 16px;
  }

  .accordion-icon {
    flex-shrink: 0;
    font-size: 24px;
    text-align: right;
  }

</style>
