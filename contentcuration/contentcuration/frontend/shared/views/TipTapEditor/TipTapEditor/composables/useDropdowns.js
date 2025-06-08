import { ref, onMounted, onUnmounted } from 'vue'

export function useDropdowns() {
  const selectedFormat = ref('Normal')
  const showHeadersDropdown = ref(false)
  const showPasteDropdown = ref(false)

  // Dropdown management
  const toggleHeadersDropdown = () => {
    showHeadersDropdown.value = !showHeadersDropdown.value
    showPasteDropdown.value = false
  }

  const togglePasteDropdown = () => {
    showPasteDropdown.value = !showPasteDropdown.value
    showHeadersDropdown.value = false
  }

  const closeAllDropdowns = () => {
    showHeadersDropdown.value = false
    showPasteDropdown.value = false
  }

  const selectFormat = (format) => {
    selectedFormat.value = format.label
    closeAllDropdowns()
    // TipTap formatting logic will be added here
    console.log('Format selected:', format)
  }

  const handleClickOutside = (event) => {
    const dropdownContainers = document.querySelectorAll('.dropdown-container')
    let isOutside = true
    
    dropdownContainers.forEach(container => {
      if (container.contains(event.target)) {
        isOutside = false
      }
    })
    
    if (isOutside) {
      closeAllDropdowns()
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClickOutside)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })

  return {
    selectedFormat,
    showHeadersDropdown,
    showPasteDropdown,
    toggleHeadersDropdown,
    togglePasteDropdown,
    closeAllDropdowns,
    selectFormat
  }
}