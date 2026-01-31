<template>

  <div class="studio-accordion">
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
          <h3 class="studio-accordion-header">
            <KButton
              :id="id"
              :text="$slots['left-actions'][0]['text']"
              appearance="flat-button"
              :aria-expanded="showAccordionItem.toString()"
              :aria-controls="id"
              :appearanceOverrides="appearanceOverrides"
              @click="openAccordion"
            >
              <template #iconAfter>
                <KIcon
                  :icon="showAccordionItem ? 'chevronUp' : 'chevronDown'"
                  :color="$themePalette.grey.v_400"
                  class="accordion-icon"
                />
              </template>
            </KButton>
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
      >
        <slot></slot>
      </div>
    </KTransition>
    <div
      v-if="!lastItem"
      :style="{
        borderBottom: `1.5px solid ${$themePalette.grey.v_200}`,
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
        default: 'studio-accordion',
      },
    },
    data() {
      return {
        showAccordionItem: false,
      };
    },
    computed: {
      appearanceOverrides() {
        return {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          textAlign: 'left',
          cursor: 'pointer',
          textTransform: 'none',
          textWrap: 'stable',
          lineHeight: '18px',
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

  .studio-accordion-header {
    ::v-deep .link-text {
      width: 100%;
    }
  }

  .studio-accordion-title {
    font-weight: 700;
    text-wrap: stable;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  }

  .accordion-icon {
    flex-shrink: 0;
    font-size: 24px;
    text-align: right;
  }

</style>
