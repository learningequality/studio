<template>
  <div class="paste-button-container dropdown-container">
    <button 
      class="toolbar-btn paste-main-btn" 
      @click="handlePaste" 
      title="Paste"
    >
      <img :src="require('../../../assets/icon-paste.svg')" alt="Paste" class="toolbar-icon">
    </button>
    <button 
      class="paste-dropdown-btn" 
      @click="toggleDropdown" 
      title="Paste Options"
    >
      <img :src="require('../../../assets/icon-chevron-down.svg')" alt="" class="dropdown-arrow">
    </button>
    <div 
      v-if="isOpen" 
      class="dropdown-menu paste-dropdown"
    >
      <div 
        v-for="option in pasteOptions" 
        :key="option.name"
        class="dropdown-item"
        @click="option.handler"
      >
        <img :src="option.icon" :alt="option.title" class="dropdown-item-icon">
        <span>{{ option.title }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useDropdowns } from '../../composables/useDropdowns'
import { useToolbarActions } from '../../composables/useToolbarActions'

export default defineComponent({
  name: 'PasteDropdown',
  setup() {
    const { 
      showPasteDropdown: isOpen, 
      togglePasteDropdown: toggleDropdown 
    } = useDropdowns()

    const { handlePaste, handlePasteNoFormat } = useToolbarActions()

    const pasteOptions = computed(() => [
      { 
        name: 'paste', 
        title: 'Paste', 
        icon: require('../../../assets/icon-paste.svg'), 
        handler: handlePaste 
      },
      { 
        name: 'pasteNoFormat', 
        title: 'Paste without formatting', 
        icon: require('../../../assets/icon-pasteNoFormat.svg'), 
        handler: handlePasteNoFormat 
      }
    ])

    return {
      isOpen,
      pasteOptions,
      toggleDropdown,
      handlePaste
    }
  }
})
</script>

<style scoped>
.paste-button-container {
  display: flex;
  position: relative;
  border-radius: 4px;
  overflow: visible;
}

.dropdown-container {
  position: relative;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toolbar-btn:hover {
  background: #e6e6e6;
}

.toolbar-btn:active {
  background: #dee2e6;
}

.toolbar-icon {
  width: 17px;
  height: 17px;
  opacity: 0.7;
}

.paste-main-btn {
  border-radius: 4px 0 0 4px !important;
  width: 28px !important;
}

.paste-dropdown-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-left: 1px solid #dee2e6;
}

.paste-dropdown-btn:hover {
  background: #e6e6e6;
}

.paste-dropdown-btn:active {
  background: #dee2e6;
}

.dropdown-arrow {
  width: 8px;
  height: 8px;
  opacity: 0.5;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  margin-top: 4px;
}

.paste-dropdown {
  right: -12px;
  min-width: 250px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 140%;
  color: #000000;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-item-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}
</style>