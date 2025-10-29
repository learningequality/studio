<template>

  <div class="studio-accordion">
    <div
      :id="id"
      tabindex="0"
      :aria-expanded="showAccordionItem.toString()"
      @click="openAccordion"
      @keydown.enter="openAccordion"
    >
      <KGrid
        :style="{
          backgroundColor: $themeTokens.surface,
        }"
      >
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
          @click="openAccordion()"
        >
          <div
            class="studio-accordion-header"
          >
            <div class="studio-accordion-title">
              <h3> 
                <slot name="left-actions"></slot>
              </h3>
            </div>
            <div>
              <KIcon
                :icon="showAccordionItem ? 'chevronUp' : 'chevronDown'"
                :color="$themePalette.grey.v_400"
                class="accordion-icon"
              />
            </div>
          </div>
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
    >
    </div>
  </div>

</template>


<script>

  export default {
    name: 'AccordionContainer',
    props: {
      lastItem: {
        type: Boolean,
        default: false
      },
      id: {
        type: String,
        default: 'studio-accordion'
      }
    },
    data() {
      return {
        showAccordionItem: false
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
    padding: 10px 24px;
    cursor: pointer;
  }

  .studio-accordion-title {
    font-weight: 700;
    text-wrap: stable;
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  }

  .accordion-icon {
    font-size: 24px;
  }

</style>