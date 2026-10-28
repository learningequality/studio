<template>

  <div class="paste-button-container">
    <button
      class="paste-main-btn toolbar-btn"
      data-toolbar-item
      :title="paste$()"
      :aria-label="paste$()"
      @click="handlePaste"
    >
      <img
        :src="require('../../../assets/icon-paste.svg')"
        alt=""
        class="toolbar-icon"
      >
    </button>
    <button
      class="paste-dropdown-btn"
      :class="
        $computedClass({
          ':is([aria-expanded=\'true\'])': {
            background: $themePalette.blue.v_100,
          },
        })
      "
      data-toolbar-item
      :title="pasteOptions$()"
      :aria-label="pasteOptionsMenu$()"
    >
      <img
        :src="require('../../../assets/icon-chevron-down.svg')"
        alt=""
        class="dropdown-arrow"
      >
      <KDropdownMenu
        :options="menuOptions"
        :constrainToScrollParent="false"
        @select="option => option.handler()"
      >
        <template #option="{ option }">
          <div class="dropdown-item">
            <img
              :src="option.icon"
              alt=""
              class="dropdown-item-icon"
            >
            <span>{{ option.label }}</span>
          </div>
        </template>
      </KDropdownMenu>
    </button>
  </div>

</template>


<script>

  import { computed, defineComponent } from 'vue';
  import { useToolbarActions } from '../../composables/useToolbarActions';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';

  export default defineComponent({
    name: 'PasteDropdown',
    setup() {
      const { handlePaste, pasteActions } = useToolbarActions();

      // KDropdownMenu reads each option's `label`.
      const menuOptions = computed(() =>
        pasteActions.value.map(action => ({ ...action, label: action.title })),
      );

      const { paste$, pasteOptions$, pasteOptionsMenu$ } = getTipTapEditorStrings();

      return {
        menuOptions,
        handlePaste,
        paste$,
        pasteOptions$,
        pasteOptionsMenu$,
      };
    },
  });

</script>


<style scoped>

  .paste-button-container {
    display: flex;
    border-radius: 4px;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .toolbar-btn:hover {
    background: #e6e6e6;
  }

  .toolbar-btn:active {
    background: #dee2e6;
  }

  .toolbar-btn:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  .toolbar-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .paste-main-btn {
    width: 28px !important;
    border-radius: 4px 0 0 4px !important;
  }

  .paste-dropdown-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 32px;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 0 4px 4px 0;
    transition: background-color 0.2s ease;
  }

  /* Leaves the open state's background to show while hovered. */
  .paste-dropdown-btn:not([aria-expanded='true']):hover {
    background: #e6e6e6;
  }

  .paste-dropdown-btn[aria-expanded='true'] .dropdown-arrow {
    filter: brightness(0) saturate(100%) invert(32%) sepia(97%) saturate(2640%) hue-rotate(230deg)
      brightness(103%) contrast(94%);
    opacity: 1;
  }

  .paste-dropdown-btn:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  .dropdown-arrow {
    width: 15px;
    height: 15px;
    opacity: 0.9;
  }

  .dropdown-item {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 250px;
    padding: 8px 12px;
    line-height: 140%;
  }

  .dropdown-item-icon {
    width: 18px;
    height: 18px;
    opacity: 0.7;
  }

</style>
