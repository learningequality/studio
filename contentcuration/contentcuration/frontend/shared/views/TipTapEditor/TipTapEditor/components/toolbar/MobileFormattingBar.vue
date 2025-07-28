<template>

  <div class="floating-panel">
    <div class="fixed-actions">
      <button
        class="toggle-btn"
        :title="isExpanded ? 'Collapse formatting bar' : 'Expand formatting bar'"
        :aria-label="isExpanded ? 'Collapse formatting bar' : 'Expand formatting bar'"
        @mousedown.prevent
        @click="toggleToolbar"
      >
        {{ isExpanded ? '×' : '+' }}
      </button>
    </div>
    <div
      v-if="isExpanded"
      class="scrollable-tools"
      aria-label="Text formatting tools"
    >
      <ToolbarButton
        v-for="action in textActions"
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-active="action.isActive"
        @click="action.handler"
      />
      <ToolbarDivider />
      <ToolbarButton
        v-for="action in listActions"
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-active="action.isActive"
        @click="action.handler"
      />
      <ToolbarDivider />
      <ToolbarButton
        v-for="action in scriptActions"
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-active="action.isActive"
        @click="action.handler"
      />
    </div>
  </div>

</template>


<script>

  import { defineComponent, ref } from 'vue';
  import { useToolbarActions } from '../../composables/useToolbarActions';
  import ToolbarButton from './ToolbarButton.vue';
  import ToolbarDivider from './ToolbarDivider.vue';

  export default defineComponent({
    name: 'MobileFormattingBar',
    components: { ToolbarButton, ToolbarDivider },
    setup() {
      const isExpanded = ref(true);

      // Pull ONLY the formatting-related actions from the central composable
      // TODO: Should we include insertion actions like the figma design here?
      const { textActions, listActions, scriptActions } = useToolbarActions();

      const toggleToolbar = () => {
        isExpanded.value = !isExpanded.value;
      };

      return {
        isExpanded,
        textActions,
        listActions,
        scriptActions,
        toggleToolbar,
      };
    },
  });

</script>


<style scoped>

  .floating-panel {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    height: 3.5rem;
    backdrop-filter: blur(0.625rem);
    border-top: 1px solid #cccccc;
    box-shadow: 0 -0.125rem 0.5rem rgba(0, 0, 0, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fixed-actions {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 1rem;
    background: rgba(248, 249, 250, 0.8);
    border-right: 1px solid #cccccc;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    font-size: 1.5rem;
    color: #555555;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toggle-btn:hover {
    color: #333333;
    background: rgba(0, 0, 0, 0.05);
    transform: scale(1.1);
  }

  .toggle-btn:active {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(0.95);
  }

  .scrollable-tools {
    display: flex;
    flex-grow: 1;
    gap: 0.625rem;
    align-items: center;
    padding: 0 1rem;
    overflow-x: auto;
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    opacity: 0;
    transform: translateX(-1.25rem);
    animation: slide-in-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes slide-in-fade {
    from {
      opacity: 0;
      transform: translateX(-1.25rem);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Hide scrollbar for a cleaner look */
  .scrollable-tools::-webkit-scrollbar {
    display: none;
  }

</style>
