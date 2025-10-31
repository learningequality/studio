<template>

  <div class="box">
    <KTransition kind="component-fade-out-in">
      <div
        v-if="loading"
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
          <KIcon
            :icon="icon"
            :style="{ fontSize: '18px' }"
          />
        </div>
        <div class="box-text">
          <div
            v-if="$slots.title || title"
            class="box-title"
          >
            <slot name="title">{{ title }}</slot>
          </div>
          <div
            v-if="$slots.description || description"
            class="box-description"
          >
            <slot name="description">{{ description }}</slot>
          </div>
          <slot></slot>
        </div>
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


<script>

  import { computed } from 'vue';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';

  export default {
    name: 'Box',
    setup(props) {
      const paletteTheme = themePalette();
      const tokensTheme = themeTokens();

      const boxBackgroundColor = computed(() => {
        switch (props.kind) {
          case 'warning':
            return paletteTheme.red.v_100;
          case 'info':
            return paletteTheme.grey.v_100;
          default:
            throw new Error(`Unsupported box kind: ${props.kind}`);
        }
      });
      const boxBorderColor = computed(() => {
        switch (props.kind) {
          case 'warning':
            return paletteTheme.red.v_300;
          case 'info':
            return 'transparent';
          default:
            return 'transparent';
        }
      });
      const icon = computed(() => {
        switch (props.kind) {
          case 'warning':
            return 'error';
          case 'info':
            return 'infoOutline';
          default:
            throw new Error(`Unsupported box kind: ${props.kind}`);
        }
      });

      const titleColor = computed(() => {
        return props.kind === 'warning' ? paletteTheme.red.v_600 : tokensTheme.text;
      });

      const descriptionColor = computed(() => {
        return props.kind === 'warning' ? paletteTheme.grey.v_800 : tokensTheme.text;
      });

      return {
        boxBackgroundColor,
        boxBorderColor,
        titleColor,
        descriptionColor,
        icon,
      };
    },
    props: {
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
      title: {
        type: String,
        required: false,
        default: '',
      },
      description: {
        type: String,
        required: false,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .box {
    padding: 10px;
    background-color: v-bind('boxBackgroundColor');
    border: 1px solid v-bind('boxBorderColor');
    border-radius: 4px;
  }

  .box-content {
    display: flex;
    gap: 8px;
    align-items: start;
  }

  .box-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 18px;
    line-height: 1;
  }

  .box-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
    line-height: 140%;
  }

  .box-title {
    font-weight: 600;
    color: v-bind('titleColor');
  }

  .box-description {
    font-weight: 400;
    color: v-bind('descriptionColor');
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
