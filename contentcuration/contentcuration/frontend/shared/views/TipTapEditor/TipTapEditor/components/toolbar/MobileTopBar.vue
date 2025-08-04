<template>

  <div
    class="toolbar top-bar"
    role="toolbar"
    aria-label="Editor controls"
  >
    <div
      class="history-actions"
      role="group"
      aria-label="History actions"
    >
      <ToolbarButton
        v-for="action in historyActions"
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-available="action.isAvailable"
        @click="action.handler"
      />
    </div>

    <div class="insert-container">
      <div class="topbar-actions">
        <button
          class="insert-button"
          title="Insert content"
          aria-label="Insert content menu"
          :aria-expanded="isInsertMenuOpen"
          aria-haspopup="menu"
          aria-controls="insert-menu"
          @click="isInsertMenuOpen = !isInsertMenuOpen"
        >
          +
        </button>
        <ToolbarButton
          :title="minimizeAction.title"
          :icon="minimizeAction.icon"
          @click="minimizeAction.handler"
        />
      </div>

      <div
        v-if="isInsertMenuOpen"
        id="insert-menu"
        ref="dropdown"
        class="insert-dropdown"
        role="menu"
        aria-label="Insert content options"
      >
        <button
          v-for="tool in insertTools"
          :key="tool.name"
          class="dropdown-item"
          role="menuitem"
          @click="tool.handler($event)"
        >
          <img
            :src="tool.icon"
            alt=""
            class="dropdown-icon"
            aria-hidden="true"
          >
          <span class="dropdown-title">{{ tool.title }}</span>
        </button>
      </div>
    </div>
  </div>

</template>


<script>

  import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
  import { useToolbarActions } from '../../composables/useToolbarActions';
  import ToolbarButton from './ToolbarButton.vue';

  export default defineComponent({
    name: 'MobileTopBar',
    components: { ToolbarButton },
    setup(props, { emit }) {
      const isInsertMenuOpen = ref(false);
      const dropdown = ref(null);

      const { historyActions, insertTools, minimizeAction } = useToolbarActions(emit);

      const handleClickOutside = event => {
        if (
          isInsertMenuOpen.value &&
          dropdown.value &&
          !dropdown.value.contains(event.target) &&
          !event.target.classList.contains('insert-button')
        ) {
          isInsertMenuOpen.value = false;
        }
      };

      onMounted(() => {
        document.addEventListener('mousedown', handleClickOutside);
      });

      onBeforeUnmount(() => {
        document.removeEventListener('mousedown', handleClickOutside);
      });

      return {
        historyActions,
        insertTools,
        minimizeAction,
        isInsertMenuOpen,
        dropdown,
      };
    },
  });

</script>


<style scoped>

  .top-bar {
    display: flex;

    /* flex-shrink: 0; */
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .history-actions {
    display: flex;
    gap: 0.25rem;
  }

  .topbar-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .insert-container {
    position: relative;
  }

  .insert-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    min-width: 44px;
    height: 36px;
    min-height: 44px;
    font-size: 2.5rem;
    color: #666666;
    cursor: pointer;
    opacity: 0.8;
  }

  .insert-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 2;
    width: 200px;
    padding: 0.5rem 0;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 44px;
    padding: 0.75rem 1rem;
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .dropdown-item:hover {
    background: #f5f5f5;
  }

  .dropdown-item:focus-visible,
  .insert-button:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  .dropdown-icon {
    width: 20px;
    height: 20px;
    margin-right: 1rem;
  }

  .dropdown-title {
    font-size: 1rem;
  }

</style>
