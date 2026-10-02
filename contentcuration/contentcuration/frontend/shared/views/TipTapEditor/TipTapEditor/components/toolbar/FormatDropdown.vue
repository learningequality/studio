<template>

  <button
    class="format-dropdown"
    data-toolbar-item
    :aria-label="textFormatOptions$()"
  >
    <span>{{ selectedFormat }}</span>
    <img
      :src="require('../../../assets/icon-chevron-down.svg')"
      alt=""
      class="dropdown-icon"
    >
    <KDropdownMenu
      :options="formatOptions"
      :constrainToScrollParent="false"
      @select="applyFormat"
    >
      <template #option="{ option }">
        <div
          class="dropdown-item tiptap-format-option"
          :class="{ 'is-selected': option.label === selectedFormat }"
          :style="
            option.label === selectedFormat
              ? { color: $themePalette.blue.v_600, backgroundColor: $themePalette.blue.v_100 }
              : null
          "
        >
          <component
            :is="option.tag"
            v-text="option.label"
          />
        </div>
      </template>
    </KDropdownMenu>
  </button>

</template>


<script>

  import { defineComponent } from 'vue';
  import { useDropdowns } from '../../composables/useDropdowns';
  import { useToolbarActions } from '../../composables/useToolbarActions';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';

  export default defineComponent({
    name: 'FormatDropdown',
    setup() {
      const { formatOptions, selectedFormat, selectFormat } = useDropdowns();

      const { handleFormatChange } = useToolbarActions();

      const { textFormatOptions$ } = getTipTapEditorStrings();

      const applyFormat = format => {
        selectFormat(format);
        handleFormatChange(format.value);
      };

      return {
        selectedFormat,
        formatOptions,
        applyFormat,
        textFormatOptions$,
      };
    },
  });

</script>


<style scoped>

  .format-dropdown {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    min-width: 100px;
    padding: 6px 8px;
    font-size: 14px;
    color: #495057;
    appearance: none;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 4px;
  }

  .format-dropdown:hover {
    background: #e6e6e6;
  }

  .format-dropdown:active {
    background: #d1d5da;
  }

  .format-dropdown:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  .dropdown-icon {
    width: 12px;
    height: 12px;
    opacity: 0.5;
  }

  .dropdown-item {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 200px;
    padding: 8px 12px;
  }

  .dropdown-item.is-selected {
    font-weight: 600;
  }

</style>
