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
          :class="{ 'is-selected': option.value === selectedValue }"
          :style="
            option.value === selectedValue
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

  import { computed, defineComponent, inject, onMounted, onUnmounted, ref } from 'vue';
  import { useToolbarActions } from '../../composables/useToolbarActions';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';

  export default defineComponent({
    name: 'FormatDropdown',
    setup() {
      const editor = inject('editor', null);

      const { handleFormatChange } = useToolbarActions();

      const {
        textFormatOptions$,
        formatSmall$,
        formatNormal$,
        formatHeader1$,
        formatHeader2$,
        formatHeader3$,
      } = getTipTapEditorStrings();

      const formatOptions = computed(() => [
        { value: 'small', label: formatSmall$(), tag: 'small' },
        { value: 'normal', label: formatNormal$(), tag: 'p' },
        { value: 'h3', label: formatHeader3$(), tag: 'h3' },
        { value: 'h2', label: formatHeader2$(), tag: 'h2' },
        { value: 'h1', label: formatHeader1$(), tag: 'h1' },
      ]);

      // Tracked by value, since two formats' labels can be translated alike.
      const selectedValue = ref('normal');
      const selectedFormat = computed(
        () => formatOptions.value.find(option => option.value === selectedValue.value).label,
      );

      // The editor is not reactive, so the format at the cursor is read again on every
      // transaction, which includes every selection change.
      const updateSelectedFormat = () => {
        const instance = editor?.value;
        if (!instance) return;
        if (instance.isActive('heading', { level: 1 })) {
          selectedValue.value = 'h1';
        } else if (instance.isActive('heading', { level: 2 })) {
          selectedValue.value = 'h2';
        } else if (instance.isActive('heading', { level: 3 })) {
          selectedValue.value = 'h3';
        } else if (instance.isActive('small')) {
          selectedValue.value = 'small';
        } else {
          selectedValue.value = 'normal';
        }
      };

      let offTransaction = null;

      onMounted(() => {
        const instance = editor?.value;
        if (instance) {
          instance.on('transaction', updateSelectedFormat);
          offTransaction = () => instance.off('transaction', updateSelectedFormat);
        }
        updateSelectedFormat();
      });

      onUnmounted(() => {
        if (offTransaction) offTransaction();
      });

      const applyFormat = format => handleFormatChange(format.value);

      return {
        selectedValue,
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
