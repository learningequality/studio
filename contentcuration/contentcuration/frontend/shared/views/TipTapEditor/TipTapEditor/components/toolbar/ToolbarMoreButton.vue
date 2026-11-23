<template>

  <button
    ref="button"
    class="more-button"
    data-toolbar-item
    :class="
      $computedClass({
        ':is([aria-expanded=\'true\'])': {
          color: $themePalette.blue.v_600,
          background: $themePalette.blue.v_100,
        },
      })
    "
    @focusin="onFocusin"
    @focusout="onFocusout"
  >
    <span>{{ moreButtonText$() }}</span>
    <img
      :src="require('../../../assets/icon-chevron-down.svg')"
      aria-hidden="true"
      class="more-button-icon"
    >
    <!-- Not kept inside the toolbar, which scrolls when too narrow, as its other menus -->
    <KDropdownMenu
      :options="options"
      :constrainToScrollParent="false"
      @select="onSelect"
    >
      <template #option="{ option }">
        <div
          class="overflow-item"
          :style="
            option.isActive
              ? {
                color: $themePalette.blue.v_600,
                backgroundColor: $themePalette.blue.v_100,
              }
              : null
          "
        >
          <KIcon
            v-if="option.kIcon"
            :icon="option.kIcon"
            class="dropdown-item-icon"
          />
          <img
            v-else
            :src="option.icon"
            class="dropdown-item-icon"
            aria-hidden="true"
          >
          <span>{{ option.label }}</span>
        </div>
      </template>
    </KDropdownMenu>
  </button>

</template>


<script>

  import { computed, onBeforeUnmount, ref, watch } from 'vue';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';

  export default {
    name: 'ToolbarMoreButton',
    setup(props, { emit }) {
      // KListWithOverflow passes the collapsed groups only to the slot rendering this button,
      // so report them to the toolbar. It drops the button once every group fits again.
      watch(
        () => props.overflowItems,
        items => emit('update:overflowItems', items),
        { immediate: true },
      );

      // Unmounting the focused button drops the focus to body, so it hands the focus on first.
      // Chrome fires focusout before this unmount hook runs, so the button lets go of the focus
      // a microtask later. Its open menu, rendered outside it, holds the focus too.
      const button = ref(null);
      let hasFocus = false;
      const onFocusin = () => {
        hasFocus = true;
      };
      const onFocusout = () =>
        queueMicrotask(() => {
          hasFocus = false;
        });

      onBeforeUnmount(() => {
        if (hasFocus || button.value.getAttribute('aria-expanded') === 'true') {
          emit('release-focus');
        }
        emit('update:overflowItems', []);
      });

      const options = computed(() => {
        const options = [];
        const toOption = a => ({
          ...a,
          label: a.title,
          disabled: a.isAvailable !== undefined ? !a.isAvailable : false,
        });

        for (const group of props.overflowItems) {
          if (group.type === 'divider') {
            options.push(group);
            continue;
          }
          for (const action of group.groupActions) {
            if (action.dropdownActions) {
              for (const dropdownAction of action.dropdownActions) {
                options.push(toOption(dropdownAction));
              }
            } else {
              options.push(toOption(action));
            }
          }
        }

        return options;
      });

      const onSelect = (option, event) => {
        option.handler(event, { fromOverflow: true });
      };

      const { moreButtonText$ } = getTipTapEditorStrings();

      return {
        button,
        options,
        onSelect,
        onFocusin,
        onFocusout,
        moreButtonText$,
      };
    },
    props: {
      /**
       * The toolbar groups and dividers KListWithOverflow has collapsed.
       */
      overflowItems: {
        type: Array,
        required: true,
      },
    },
    emits: ['update:overflowItems', 'release-focus'],
  };

</script>


<style lang="scss" scoped>

  .more-button {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    cursor: pointer;
    border: 0;
    border-radius: 4px;
    transition: background-color 0.15s ease;
  }

  .more-button:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  .more-button-icon {
    width: 16px;
    height: 16px;
    margin-left: 4px;
    transition: transform 0.15s ease;
  }

  .more-button[aria-expanded='true'] .more-button-icon {
    transform: rotate(180deg);
  }

  .overflow-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 8px 12px;
    font-size: 1.2rem;
    line-height: 140%;
  }

  .dropdown-item-icon {
    /* Undoes KIcon's inline-text nudge, which misaligns it with the img icons. */
    top: 0;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

</style>
