<template>

  <div
    class="toolbar"
    role="toolbar"
    :aria-label="textFormattingToolbar$()"
  >
    <!-- History buttons -->
    <div
      role="group"
      :aria-label="historyActions$()"
    >
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
    <div
      role="group"
      :aria-label="textFormattingOptions$()"
    >
      <FormatDropdown />
    </div>

    <ToolbarDivider />

    <!-- Text formatting -->
    <div
      role="group"
      :aria-label="textStyleFormatting$()"
    >
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
    <div
      role="group"
      :aria-label="copyAndPasteActions$()"
    >
      <ToolbarButton
        :title="copy$()"
        :icon="require('../../assets/icon-copy.svg')"
        @click="handleCopy"
      />
      <PasteDropdown />
    </div>

    <ToolbarDivider />

    <!-- Lists -->
    <div
      role="group"
      :aria-label="listFormatting$()"
    >
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
    <div
      role="group"
      :aria-label="scriptFormatting$()"
    >
      <ToolbarButton
        v-for="script in scriptActions"
        :key="script.name"
        :title="script.title"
        :icon="script.icon"
        :rtl-icon="script.rtlIcon"
        :is-active="script.isActive"
        @click="script.handler"
      />
    </div>

    <ToolbarDivider />

    <!-- Insert tools -->
    <div
      role="group"
      :aria-label="insertTools$()"
    >
      <ToolbarButton
        v-for="tool in insertTools"
        :key="tool.name"
        :title="tool.title"
        :icon="tool.icon"
        :is-active="tool.isActive"
        @click="onToolClick(tool)"
      />
    </div>
  </div>

</template>


<script>

  import { defineComponent } from 'vue';
  import { useToolbarActions } from '../composables/useToolbarActions';
  import { getTipTapEditorStrings } from '../TipTapEditorStrings';
  import ToolbarButton from './toolbar/ToolbarButton.vue';
  import FormatDropdown from './toolbar/FormatDropdown.vue';
  import PasteDropdown from './toolbar/PasteDropdown.vue';
  import ToolbarDivider from './toolbar/ToolbarDivider.vue';

  export default defineComponent({
    name: 'EditorToolbar',
    components: {
      ToolbarButton,
      FormatDropdown,
      PasteDropdown,
      ToolbarDivider,
    },
    setup(props, { emit }) {
      const {
        handleCopy,
        historyActions,
        textActions,
        listActions,
        scriptActions,
        insertTools,
        t,
      } = useToolbarActions(emit);

      const {
        copy$,
        textFormattingToolbar$,
        historyActions$,
        textFormattingOptions$,
        textStyleFormatting$,
        copyAndPasteActions$,
        listFormatting$,
        scriptFormatting$,
        insertTools$,
      } = getTipTapEditorStrings();


      const onToolClick = tool => {
        if (tool.name === 'image') {
          emit('insert-image');
        } else {
          // For all other buttons, call their original handler
          tool.handler();
        }
      };

      return {
        handleCopy,
        onToolClick,
        t,
        historyActions,
        textActions,
        listActions,
        scriptActions,
        insertTools,
        copy$,
        textFormattingToolbar$,
        historyActions$,
        textFormattingOptions$,
        textStyleFormatting$,
        copyAndPasteActions$,
        listFormatting$,
        scriptFormatting$,
        insertTools$,
      };
    },
  });

</script>


<style scoped>

  .toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #e1e5e9;
    border-radius: 8px 8px 0 0;
  }

  [role='group'] {
    display: flex;
    gap: 2px;
    align-items: center;
  }

</style>
