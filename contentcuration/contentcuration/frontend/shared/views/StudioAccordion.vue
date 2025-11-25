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
          <h3>
            <button
              :id="id"
              type="button"
              :aria-expanded="showAccordionItem.toString()"
              :aria-controls="id"
              class="studio-accordion-header"
              @click="openAccordion"
            >
              <span class="studio-accordion-title">
                <slot name="left-actions"></slot>
              </span>
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
      <div v-if="showAccordionItem">
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
    methods: {
      openAccordion() {
        this.showAccordionItem = !this.showAccordionItem;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .studio-accordion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 24px;
    cursor: pointer;
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
    font-size: 24px;
    text-align: right;
  }

</style>
