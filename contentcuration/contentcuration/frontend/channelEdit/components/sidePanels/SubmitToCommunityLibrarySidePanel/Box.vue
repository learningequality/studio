<template>

  <div class="box">
    <KTransition kind="component-fade-out-in">
      <div
        v-if="props.loading"
        key="box-loader-wrapper"
        class="loader-wrapper"
      >
        <KCircularLoader disableDefaultTransition />
      </div>
      <div
        v-else
        key="box-content"
        class="box-content"
      >
        <div class="box-icon">
          <KIcon :icon="icon" />
        </div>
        <slot></slot>
        <div
          v-if="$slots.chip"
          class="chip"
        >
          <slot name="chip"></slot>
        </div>
      </div>
    </KTransition>
  </div>

</template>


<script setup>

  import { computed } from 'vue';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';

  const props = defineProps({
    kind: {
      type: String,
      required: false,
      default: 'info',
      validator: value => ['warning', 'info'].includes(value),
    },
    loading: {
      type: Boolean,
      required: false,
      default: false,
    },
  });

  const paletteTheme = themePalette();
  const tokensTheme = themeTokens();

  const boxBackgroundColor = computed(() => {
    switch (props.kind) {
      case 'warning':
        return paletteTheme.yellow.v_100;
      case 'info':
        return paletteTheme.grey.v_100;
      default:
        throw new Error(`Unsupported box kind: ${props.kind}`);
    }
  });
  const boxTextColor = computed(() => {
    switch (props.kind) {
      case 'warning':
        return paletteTheme.red.v_500;
      case 'info':
        return tokensTheme.text;
      default:
        throw new Error(`Unsupported box kind: ${props.kind}`);
    }
  });
  const icon = computed(() => {
    switch (props.kind) {
      case 'warning':
        return 'warningIncomplete';
      case 'info':
        return 'infoOutline';
      default:
        throw new Error(`Unsupported box kind: ${props.kind}`);
    }
  });

</script>


<style lang="scss" scoped>

  .box {
    padding: 8px;
    color: v-bind('boxTextColor');
    background-color: v-bind('boxBackgroundColor');
    border-radius: 4px;
  }

  .box-content {
    display: flex;
    gap: 8px;
  }

  .box-icon {
    width: 20px;
    height: 20px;
  }

  .chip {
    margin-left: auto;
  }

  .loader-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

</style>
