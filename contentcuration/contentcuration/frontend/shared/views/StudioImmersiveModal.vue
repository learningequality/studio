<template>

  <div
    v-if="value"
    class="modal-wrapper"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <KToolbar
      textColor="white"
      :style="{ backgroundColor: $themePalette.grey.v_900 }"
    >
      <template #icon>
        <KIconButton
          icon="close"
          :ariaLabel="$tr('close')"
          :tooltip="$tr('close')"
          color="white"
          data-test="close"
          @click="$emit('input', false)"
        />
      </template>

      <template #default>
        <span class="notranslate toolbar-title">
          <slot name="header">{{ title }}</slot>
        </span>
      </template>

      <template #actions>
        <slot name="action"></slot>
      </template>
    </KToolbar>

    <StudioOfflineAlert :offset="64" />

    <StudioPage
      :offline="offline"
      :marginTop="0"
    >
      <slot></slot>
    </StudioPage>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import StudioOfflineAlert from './StudioOfflineAlert';
  import StudioPage from './StudioPage';

  export default {
    name: 'StudioImmersiveModal',
    components: {
      StudioOfflineAlert,
      StudioPage,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        required: false,
        default: '',
      },
    },
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
    },
    mounted() {
      document.documentElement.classList.add('modal-open');
      const handleKeyDown = event => {
        if (event.key === 'Escape') {
          this.$emit('input', false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      this.$once('hook:beforeDestroy', () => {
        document.documentElement.classList.remove('modal-open');
        document.removeEventListener('keydown', handleKeyDown);
      });
    },
    $trs: {
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  .modal-wrapper {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 16;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .toolbar-title {
    margin-inline-start: 16px;
    margin-inline-end: 16px;
  }

</style>


<style lang="scss">

  html.modal-open {
    overflow-y: hidden !important;
  }

</style>
