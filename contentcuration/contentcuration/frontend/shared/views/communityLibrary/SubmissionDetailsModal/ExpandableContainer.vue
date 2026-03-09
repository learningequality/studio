<template>

  <div class="disclosure-container">
    <div class="disclosure-header">
      <h2 ref="disclosureTitleRef">
        {{ title }}
      </h2>
      <KButton
        v-if="expandable"
        appearance="basic-link"
        :aria-controls="expandableContentId"
        :aria-expanded="isOpen.toString()"
        :text="isOpen ? seeLessAction$() : seeAllAction$()"
        @click="toggleDisclosure"
      />
    </div>
    <slot
      :isOpen="isOpen"
      :expandableContentId="expandableContentId"
    ></slot>
  </div>

</template>


<script setup>

  import { nextTick, ref } from 'vue';
  import { v4 as uuidv4 } from 'uuid';
  import { commonStrings } from 'shared/strings/commonStrings';

  const emit = defineEmits(['update:isOpen']);

  defineProps({
    title: {
      type: String,
      default: '',
    },
    expandable: {
      type: Boolean,
      default: true,
    },
  });

  const disclosureTitleRef = ref(null);

  const isOpen = ref(false);

  const instanceId = uuidv4();
  const expandableContentId = `content-${instanceId}`;

  const { seeAllAction$, seeLessAction$ } = commonStrings;

  async function toggleDisclosure() {
    isOpen.value = !isOpen.value;
    emit('update:isOpen', isOpen.value);
    if (isOpen.value) {
      await nextTick();
      disclosureTitleRef.value.scrollIntoView({ behavior: 'smooth' });
    }
  }

</script>


<style scoped lang="scss">

  @import '~kolibri-design-system/lib/styles/definitions';

  .disclosure-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h2 {
      margin: 0;
    }
  }

  .disclosure-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 12px 18px;
    border: 1px solid v-bind('$themeTokens.fineLine');
    border-radius: $radius;
  }

</style>
