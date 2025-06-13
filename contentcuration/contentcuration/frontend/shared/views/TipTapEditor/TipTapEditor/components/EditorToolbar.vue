<template>
  <div class="toolbar" role="toolbar" :aria-label="t('textFormattingToolbar')">
    <!-- History buttons -->
    <div role="group" :aria-label="t('historyActions')">
      <ToolbarButton
        v-for="action in historyActions"
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-available="action.isAvailable"
        :should-flip-in-rtl="true"
        @click="action.handler"
      />
    </div>

    <ToolbarDivider />

    <!-- Format dropdown -->
    <div role="group" :aria-label="t('textFormattingOptions')">
      <FormatDropdown />
    </div>

    <ToolbarDivider />

    <!-- Text formatting -->
    <div role="group" :aria-label="t('textStyleFormatting')">
      <ToolbarButton 
        v-for="action in textActions" 
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-active="action.isActive"
        @click="action.handler"
      />
    </div>

    <ToolbarDivider />

    <!-- Copy/Paste -->
    <div role="group" :aria-label="t('copyAndPasteActions')">
      <ToolbarButton 
        :title="t('copy')"
        :icon="require('../../assets/icon-copy.svg')"
        @click="handleCopy"
      />
      <PasteDropdown />
    </div>

    <ToolbarDivider />

    <!-- Lists -->
    <div role="group" :aria-label="t('listFormatting')">
      <ToolbarButton 
        v-for="list in listActions" 
        :key="list.name"
        :title="list.title"
        :icon="list.icon"
        :rtl-icon="list.rtlIcon"
        :should-flip-in-rtl="list.name === 'bulletList'"
        :is-active="list.isActive"
        @click="list.handler"
      />
    </div>

    <ToolbarDivider />

    <!-- Script formatting -->
    <div role="group" :aria-label="t('scriptFormatting')">
      <ToolbarButton 
        v-for="script in scriptActions" 
        :key="script.name"
        :title="script.title"
        :icon="script.icon"
        @click="script.handler"
      />
    </div>

    <ToolbarDivider />

    <!-- Insert tools -->
    <div role="group" :aria-label="t('insertTools')">
      <ToolbarButton 
        v-for="tool in insertTools" 
        :key="tool.name"
        :title="tool.title"
        :icon="tool.icon"
        @click="tool.handler"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import ToolbarButton from './toolbar/ToolbarButton.vue'
import FormatDropdown from './toolbar/FormatDropdown.vue'
import PasteDropdown from './toolbar/PasteDropdown.vue'
import ToolbarDivider from './toolbar/ToolbarDivider.vue'
import { useToolbarActions } from '../composables/useToolbarActions'

export default defineComponent({
  name: 'EditorToolbar',
  components: {
    ToolbarButton,
    FormatDropdown,
    PasteDropdown,
    ToolbarDivider
  },
  setup() {
    const {
      handleCopy,
      historyActions,
      textActions,
      listActions,
      scriptActions,
      insertTools,
      t
    } = useToolbarActions()

    return {
      handleCopy,
      t,
      historyActions,
      textActions,
      listActions,
      scriptActions,
      insertTools
    }
  }
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
  gap: 8px;
}

[role="group"] {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>