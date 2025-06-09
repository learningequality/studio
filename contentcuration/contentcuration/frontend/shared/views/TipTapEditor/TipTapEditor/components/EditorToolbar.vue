<template>
  <div class="toolbar">
    <!-- History buttons -->
    <ToolbarGroup>
      <ToolbarButton 
        title="Undo"
        :icon="require('../../assets/icon-undo.svg')"
        @click="handleUndo"
      />
      <ToolbarButton 
        title="Redo"
        :icon="require('../../assets/icon-redo.svg')"
        @click="handleRedo"
      />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- Format dropdown -->
    <ToolbarGroup>
      <FormatDropdown />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- Text formatting -->
    <ToolbarGroup>
      <ToolbarButton 
        v-for="action in textActions" 
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-active="action.isActive"
        @click="action.handler"
      />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- Copy/Paste -->
    <ToolbarGroup>
      <ToolbarButton 
        title="Copy"
        :icon="require('../../assets/icon-copy.svg')"
        @click="handleCopy"
      />
      <PasteDropdown />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- Lists -->
    <ToolbarGroup>
      <ToolbarButton 
        v-for="list in listActions" 
        :key="list.name"
        :title="list.title"
        :icon="list.icon"
        :is-active="list.isActive"
        @click="list.handler"
      />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- Script formatting -->
    <ToolbarGroup>
      <ToolbarButton 
        v-for="script in scriptActions" 
        :key="script.name"
        :title="script.title"
        :icon="script.icon"
        @click="script.handler"
      />
    </ToolbarGroup>

    <ToolbarDivider />

    <!-- Insert tools -->
    <ToolbarGroup>
      <ToolbarButton 
        v-for="tool in insertTools" 
        :key="tool.name"
        :title="tool.title"
        :icon="tool.icon"
        @click="tool.handler"
      />
    </ToolbarGroup>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import ToolbarGroup from './toolbar/ToolbarGroup.vue'
import ToolbarButton from './toolbar/ToolbarButton.vue'
import FormatDropdown from './toolbar/FormatDropdown.vue'
import PasteDropdown from './toolbar/PasteDropdown.vue'
import ToolbarDivider from './toolbar/ToolbarDivider.vue'
import { useToolbarActions } from '../composables/useToolbarActions'

export default defineComponent({
  name: 'EditorToolbar',
  components: {
    ToolbarGroup,
    ToolbarButton,
    FormatDropdown,
    PasteDropdown,
    ToolbarDivider
  },
  setup() {
    const {
      handleUndo,
      handleRedo,
      handleCopy,
      textActions,
      listActions,
      scriptActions,
      insertTools
    } = useToolbarActions()

    return {
      handleUndo,
      handleRedo,
      handleCopy,
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
</style>