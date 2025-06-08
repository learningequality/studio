<template>
  <div class="dropdown-container">
    <button 
      class="format-dropdown" 
      @click="toggleDropdown"
    >
      <span>{{ selectedFormat }}</span>
      <img :src="require('../../../assets/icon-chevron-down.svg')" alt="" class="dropdown-icon">
    </button>
    <div 
      v-if="isOpen" 
      class="dropdown-menu headers-dropdown"
    >
      <div 
        v-for="format in formatOptions" 
        :key="format.value"
        class="dropdown-item" 
        @click="selectFormat(format)"
      >
        <component :is="format.tag" v-text="format.label" />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useDropdowns } from '../../composables/useDropdowns'

export default defineComponent({
  name: 'FormatDropdown',
  setup() {
    const { 
      selectedFormat, 
      showHeadersDropdown: isOpen, 
      toggleHeadersDropdown: toggleDropdown,
      selectFormat
    } = useDropdowns()

    const formatOptions = computed(() => [
      { value: 'small', label: 'small', tag: 'small' },
      { value: 'normal', label: 'Normal', tag: 'p' },
      { value: 'h3', label: 'Header 3', tag: 'h3' },
      { value: 'h2', label: 'Header 2', tag: 'h2' },
      { value: 'h1', label: 'Header 1', tag: 'h1' }
    ])

    return {
      selectedFormat,
      isOpen,
      formatOptions,
      toggleDropdown,
      selectFormat
    }
  }
})
</script>

<style scoped>
.dropdown-container {
  position: relative;
}

.format-dropdown {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px 8px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  border-radius: 4px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.format-dropdown:hover {
  background: #e6e6e6;
}

.dropdown-icon {
  width: 12px;
  height: 12px;
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
</style>