<template>

  <KFocusTrap
    v-if="value"
    @shouldFocusFirstEl="focusFirstEl"
    @shouldFocusLastEl="focusLastEl"
  >
    <div
      ref="modalRef"
      class="modal-wrapper"
      data-testid="modal-wrapper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="immersive-modal-title"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <KToolbar
        textColor="white"
        :style="{ backgroundColor: $themeTokens.appBarDark }"
      >
        <template #icon>
          <KIconButton
            icon="close"
            :ariaLabel="$tr('close')"
            :color="$themeTokens.textInverted"
            data-test="close"
            @click="$emit('input', false)"
          />
        </template>

        <template #default>
          <span
            id="immersive-modal-title"
            class="toolbar-title"
          >
            <slot name="header">{{ title }}</slot>
          </span>
        </template>

        <template #actions>
          <slot name="action"></slot>
        </template>
      </KToolbar>

      <StudioOfflineAlert :offset="46" />

      <StudioPage
        :offline="offline"
        :marginTop="0"
        :centered="true"
      >
        <slot></slot>
      </StudioPage>
    </div>
  </KFocusTrap>

</template>


<script>

  import { mapState } from 'vuex';
  import StudioOfflineAlert from './StudioOfflineAlert';
  import StudioPage from './StudioPage';
  import { getFirstFocusableElement, getLastFocusableElement } from 'shared/utils/focusUtils';

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
    watch: {
      value: {
        handler(newValue) {
          if (newValue) {
            this.onModalOpen();
          } else {
            this.onModalClose();
          }
        },
        immediate: true,
      },
    },
    beforeDestroy() {
      this.onModalClose();
    },
    methods: {
      onModalOpen() {
        if (!this.handleKeyDown) {
          this.handleKeyDown = event => {
            if (event.key === 'Escape') {
              this.$emit('input', false);
            }
          };
          document.addEventListener('keydown', this.handleKeyDown);
        }

        document.documentElement.classList.add('modal-open');

        this.lastFocus = document.activeElement;
        this.$nextTick(() => {
          this.focusFirstEl();
        });
      },
      onModalClose() {
        if (this.handleKeyDown) {
          document.removeEventListener('keydown', this.handleKeyDown);
          this.handleKeyDown = null;
        }
        document.documentElement.classList.remove('modal-open');

        if (this.lastFocus) {
          this.lastFocus.focus();
        }
      },
      focusLastEl() {
        const modalRef = this.$refs['modalRef'];
        const lastEl = getLastFocusableElement(modalRef);
        if (lastEl) {
          lastEl.focus();
        }
      },

      focusFirstEl() {
        const modalRef = this.$refs['modalRef'];
        const firstEl = getFirstFocusableElement(modalRef);
        if (firstEl) {
          firstEl.focus();
        }
      },
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
  }

  .toolbar-title {
    margin-inline-start: 16px;
    margin-inline-end: 16px;
  }

</style>
