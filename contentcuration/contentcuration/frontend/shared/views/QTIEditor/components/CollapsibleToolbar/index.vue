<template>

  <div class="collapsible-toolbar">
    <div class="icon-actions-wrapper">
      <KIconButton
        v-for="action in visibleIconActions"
        :key="action.id"
        :ref="el => setActionRef(action.id, el)"
        :icon="action.icon"
        :tooltip="action.label"
        :ariaLabel="action.label"
        :disabled="action.disabled"
        :color="action.disabled ? $themeTokens.textDisabled : $themePalette.grey.v_800"
        @click="action.handler"
      />
    </div>

    <KIconButton
      v-if="collapsedMenuActions.length > 0"
      ref="optionsButton"
      icon="optionsVertical"
      :color="$themePalette.grey.v_800"
      :tooltip="optionsLabel || optionsLabel$()"
      :ariaLabel="optionsLabel || optionsLabel$()"
    >
      <template #menu>
        <KDropdownMenu
          :options="dropdownOptions"
          @select="handleSelect"
        />
      </template>
    </KIconButton>
  </div>

</template>


<script>

  import { computed, ref } from 'vue';
  import { commonStrings } from 'shared/strings/commonStrings';

  export default {
    name: 'CollapsibleToolbar',

    setup(props) {
      const { optionsLabel$ } = commonStrings;
      /** Actions with an icon that are not explicitly collapsed */
      const visibleIconActions = computed(() => {
        return props.actions.filter(a => !a.collapsed && Boolean(a.icon));
      });

      /** Actions without an icon MUST go to the menu, along with explicitly collapsed ones */
      const collapsedMenuActions = computed(() => {
        return props.actions.filter(a => a.collapsed || !a.icon);
      });

      const dropdownOptions = computed(() => {
        return collapsedMenuActions.value.map(action => ({
          label: action.label,
          value: action.id,
          disabled: action.disabled,
        }));
      });

      function handleSelect(option) {
        const action = collapsedMenuActions.value.find(a => a.id === option.value);
        if (action && action.handler) {
          action.handler();
        }
      }

      const actionButtons = {};
      const optionsButton = ref(null);

      function setActionRef(id, button) {
        if (button) {
          actionButtons[id] = button;
        } else {
          delete actionButtons[id];
        }
      }

      /** Moves focus to an action's button, or to the options menu holding it if collapsed. */
      function focusAction(id) {
        if (!props.actions.some(action => action.id === id)) return;
        const button = actionButtons[id] ?? optionsButton.value;
        button?.$el.focus();
      }

      return {
        optionsButton,
        setActionRef,
        visibleIconActions,
        collapsedMenuActions,
        dropdownOptions,
        handleSelect,
        // Public: lets a consumer move focus onto one of the actions.
        // eslint-disable-next-line vue/no-unused-properties
        focusAction,
        optionsLabel$,
      };
    },

    props: {
      /**
       * Array of actions:
       * {
       *   id: string,
       *   icon: string | null,
       *   label: string,
       *   handler: Function,
       *   collapsed?: boolean,
       *   disabled?: boolean
       * }
       */
      actions: {
        type: Array,
        required: true,
        validator(actions) {
          return actions.every(
            a =>
              typeof a.id === 'string' &&
              typeof a.label === 'string' &&
              typeof a.handler === 'function',
          );
        },
      },
      /** Tooltip text for the generic options menu icon */
      optionsLabel: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .collapsible-toolbar {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: flex-end;
  }

  .icon-actions-wrapper {
    display: flex;
    gap: 4px;
    align-items: center;
  }

</style>
