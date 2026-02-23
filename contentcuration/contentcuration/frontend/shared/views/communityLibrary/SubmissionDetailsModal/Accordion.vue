<template>

  <div class="accordion-container">
    <div class="accordion-header">
      <h2 ref="accordionTitleRef">
        {{ title }}
      </h2>
      <KButton
        appearance="basic-link"
        :text="isOpen ? seeLessAction$() : seeAllAction$()"
        @click="toggleAccordion"
      />
    </div>
    <slot :isOpen="isOpen"></slot>
  </div>

</template>


<script setup>

  import { nextTick, ref } from 'vue';
  import { commonStrings } from 'shared/strings/commonStrings';

  const emit = defineEmits(['open']);

  defineProps({
    title: {
      type: String,
      default: '',
    },
  });

  const accordionTitleRef = ref(null);

  const isOpen = ref(false);

  const { seeAllAction$, seeLessAction$ } = commonStrings;

  async function toggleAccordion() {
    isOpen.value = !isOpen.value;
    emit('open', isOpen.value);
    if (isOpen.value) {
      await nextTick();
      accordionTitleRef.value.scrollIntoView({ behavior: 'smooth' });
    }
  }

</script>


<style scoped lang="scss">

  @import '~kolibri-design-system/lib/styles/definitions';

  .accordion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h2 {
      margin: 0;
    }
  }

  .accordion-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 12px 18px;
    border: 1px solid v-bind('$themeTokens.fineLine');
    border-radius: $radius;
  }

</style>
