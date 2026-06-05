<template>

  <div>
    <div class="hints-header">
      <button
        id="hints-section-button"
        class="hints-header-button"
        :aria-expanded="sectionOpen.toString()"
        aria-controls="hints-section-content"
        :class="$computedClass(coreOutlineFocus)"
        @click="sectionOpen = !sectionOpen"
      >
        <span class="hints-label">
          {{ $tr('hintsLabel') }}
        </span>
        <KIcon
          icon="dropdown"
          class="hints-chevron"
          :style="{ transform: sectionOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '24px' }"
        />
      </button>
      <div
        class="full-width-divider"
        :style="{ borderTop: `1px solid ${$themeTokens.fineLine}` }"
      ></div>
    </div>

    <div
      v-if="sectionOpen"
      id="hints-section-content"
      role="region"
      aria-labelledby="hints-section-button"
      class="hints-section"
    >
      <div class="hints-list">
        <div
          v-if="!hints || !hints.length"
          class="hint-border no-hints-placeholder"
          :style="{ borderColor: $themeTokens.fineLine }"
        >
          {{ $tr('noHintsPlaceholder') }}
        </div>
        <div
          v-for="(hint, hintIdx) in hints"
          :key="hintIdx"
          class="hint-border"
          :style="{ borderColor: $themeTokens.fineLine }"
          data-test="hint"
          @click="onHintClick($event, hintIdx)"
        >
          <div :class="hintClasses(hintIdx)">
            <div
              class="hint-card-text"
              :class="{ 'is-closed': !isHintOpen(hintIdx), 'small-screen': isSmallScreen }"
            >
              <div
                class="hint-layout"
                :class="{ 'is-open': isHintOpen(hintIdx), 'small-screen': isSmallScreen }"
              >
                <div class="hint-content">
                  <!-- View mode: TipTapEditor in view mode to render Markdown properly -->
                  <div
                    v-if="!isHintOpen(hintIdx)"
                    class="hint-view-text"
                  >
                    <span
                      v-if="isHintEmpty(hint)"
                      :style="hintPlaceholderStyle"
                    >
                      {{ hintDisplayText(hint, hintIdx) }}
                    </span>
                    <div
                      v-else
                      class="hint-view-editor"
                    >
                      <TipTapEditor
                        v-model="hint.hint"
                        mode="view"
                        :image-processor="EditorImageProcessor"
                      />
                    </div>
                  </div>
                  <!-- Edit mode: TipTapEditor -->
                  <keep-alive
                    v-else
                    :max="5"
                  >
                    <TipTapEditor
                      v-model="hint.hint"
                      mode="edit"
                      :autofocus="isHintOpen(hintIdx)"
                      :image-processor="EditorImageProcessor"
                      minHeight="80px"
                      @update="updateHintText($event, hintIdx)"
                      @minimize="emitClose"
                    />
                  </keep-alive>
                </div>

                <div class="hint-actions">
                  <AssessmentItemToolbar
                    :iconActionsConfig="toolbarIconActions"
                    :collapse="isSmallScreen"
                    :displayMenu="isSmallScreen"
                    :canMoveUp="!isHintFirst(hintIdx)"
                    :canMoveDown="!isHintLast(hintIdx)"
                    class="toolbar"
                    analyticsLabel="Hint"
                    @click="onToolbarClick($event, hintIdx)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <KButton
        class="hint-editor-button"
        data-test="newHintBtn"
        appearance="flat-button"
        :appearanceOverrides="buttonAppearanceOverrides"
        @click="addNewHint"
      >
        <div class="add-hint-btn-content">
          <KIcon
            icon="plus"
            :color="$themeTokens.primary"
          />
          <span>{{ $tr('newHintBtnLabel') }}</span>
        </div>
      </KButton>
    </div>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import AssessmentItemToolbar from '../AssessmentItemToolbar';
  import { AssessmentItemToolbarActions } from '../../constants';
  import { swapElements } from 'shared/utils/helpers';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

  const updateHintsOrder = hints => {
    return hints.map((hint, idx) => {
      return {
        ...hint,
        order: idx + 1,
      };
    });
  };

  export default {
    name: 'HintsEditor',
    components: {
      AssessmentItemToolbar,
      TipTapEditor,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    model: {
      prop: 'hints',
      event: 'update',
    },
    props: {
      hints: {
        type: Array,
        default: () => [],
      },
      openHintIdx: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        sectionOpen: false,
        toolbarIconActions: [
          [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
          [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
        EditorImageProcessor,
      };
    },
    computed: {
      coreOutlineFocus() {
        return {
          ':focus': {
            ...this.$coreOutline,
            outlineOffset: '0px',
          },
        };
      },
      isSmallScreen() {
        return this.windowIsSmall;
      },
      buttonAppearanceOverrides() {
        return {
          backgroundColor: this.$themeBrand.primary.v_50,
          border: `1px dashed ${this.$themeBrand.primary.v_200}`,
          color: `${this.$themeTokens.primary} !important`,
          fontSize: '14px',
          fontWeight: '600',
          textTransform: 'none',
          ':hover': {
            backgroundColor: this.$themeBrand.primary.v_100,
          },
        };
      },
      hintPlaceholderStyle() {
        return {
          color: this.$themePalette.grey.v_300,
        };
      },
    },
    methods: {
      emitOpen(hintIdx) {
        this.$emit('open', hintIdx);
      },
      emitClose() {
        this.$emit('close');
      },
      emitUpdate(updatedHints) {
        this.$emit('update', updatedHints);
      },
      isHintOpen(hintIdx) {
        return hintIdx === this.openHintIdx;
      },
      isHintEmpty(hint) {
        return !hint.hint || !hint.hint.trim();
      },
      hintDisplayText(hint, hintIdx) {
        return this.isHintEmpty(hint)
          ? this.$tr('hintPlaceholder', { index: hintIdx + 1 })
          : hint.hint;
      },
      isHintFirst(hintIdx) {
        return hintIdx === 0;
      },
      isHintLast(hintIdx) {
        return hintIdx === this.hints.length - 1;
      },
      hintClasses(hintIdx) {
        const classes = ['hint'];

        if (!this.isHintOpen(hintIdx)) {
          classes.push('closed');
          classes.push(
            this.$computedClass({
              ':hover': {
                backgroundColor: this.$themePalette.grey.v_100,
              },
            }),
          );
        }

        return classes;
      },
      moveHintUp(hintIdx) {
        if (this.isHintFirst(hintIdx)) {
          return;
        }

        let updatedHints = swapElements(this.hints, hintIdx, hintIdx - 1);
        updatedHints = updateHintsOrder(updatedHints);

        this.emitUpdate(updatedHints);

        if (this.isHintOpen(hintIdx)) {
          this.emitOpen(hintIdx - 1);
        } else if (this.isHintOpen(hintIdx - 1)) {
          this.emitOpen(hintIdx);
        }
      },
      moveHintDown(hintIdx) {
        if (this.isHintLast(hintIdx)) {
          return;
        }

        let updatedHints = swapElements(this.hints, hintIdx, hintIdx + 1);
        updatedHints = updateHintsOrder(updatedHints);

        this.emitUpdate(updatedHints);

        if (this.isHintOpen(hintIdx)) {
          this.emitOpen(hintIdx + 1);
        } else if (this.isHintOpen(hintIdx + 1)) {
          this.emitOpen(hintIdx);
        }
      },
      deleteHint(hintIdx) {
        let updatedHints = JSON.parse(JSON.stringify(this.hints));

        updatedHints.splice(hintIdx, 1);
        updatedHints = updateHintsOrder(updatedHints);

        this.emitUpdate(updatedHints);

        if (this.isHintOpen(hintIdx)) {
          this.emitClose();
        } else if (this.openHintIdx > hintIdx) {
          this.emitOpen(this.openHintIdx - 1);
        }
      },
      onHintClick(event, hintIdx) {
        if (this.isHintOpen(hintIdx)) {
          return;
        }

        // do not open hint on toolbar click
        if (event.target.closest('.toolbar') !== null) {
          return;
        }

        // do not open on editor minimize button click
        if (event.target.classList.contains('tui-toolbar-btn-minimize')) {
          return;
        }

        this.emitOpen(hintIdx);
        this.$analytics.trackAction('exercise_editor', 'Open', {
          eventLabel: 'Hint',
        });
      },
      onToolbarClick(action, hintIdx) {
        switch (action) {
          case AssessmentItemToolbarActions.MOVE_ITEM_UP:
            this.moveHintUp(hintIdx);
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_DOWN:
            this.moveHintDown(hintIdx);
            break;

          case AssessmentItemToolbarActions.DELETE_ITEM:
            this.deleteHint(hintIdx);
            break;
        }
      },
      addNewHint() {
        // do not allow adding more empty hints
        let updatedHints = [];
        if (this.hints) {
          updatedHints = this.hints.filter(
            hint => hint.hint !== undefined && hint.hint.trim() !== '',
          );
        }
        updatedHints = updateHintsOrder(updatedHints);

        updatedHints.push({
          hint: '',
          order: updatedHints.length + 1,
        });

        this.emitUpdate(updatedHints);
        this.emitOpen(updatedHints.length - 1);
        this.$analytics.trackAction('exercise_editor', 'Add', {
          eventLabel: 'Hint',
        });
      },
      updateHintText(newHintText, hintIdx) {
        if (newHintText === this.hints[hintIdx].hint) {
          return;
        }

        const updatedHints = [...this.hints];
        updatedHints[hintIdx].hint = newHintText;

        this.emitUpdate(updatedHints);
      },
    },
    $trs: {
      hintsLabel: 'Hints (optional)',
      noHintsPlaceholder: 'Question has no hints',
      newHintBtnLabel: 'Add hint',
      hintPlaceholder: 'Enter hint {index}...',
    },
  };

</script>


<style lang="scss" scoped>

  .full-width-divider {
    max-width: none !important;
    margin: 0 calc(-1 * var(--question-card-horizontal-padding, 20px)) 0;
  }

  .hints-header {
    user-select: none;
  }

  .hints-header-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 15px 0;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .hints-label {
    font-size: 12px;
    font-weight: 600;
  }

  .hints-chevron {
    transition: transform 0.2s ease;
  }

  .hints-section {
    margin-top: 10px;
  }

  .hints-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .hint-border {
    border: 1px solid;
    border-radius: 4px;
  }

  .no-hints-placeholder {
    padding: 16px;
  }

  .hint-card-text {
    padding: 16px;

    &.small-screen {
      padding: 8px;
    }

    &.is-closed {
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .hint-layout {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &.is-open {
      align-items: flex-start;
    }

    &.small-screen {
      .hint-actions {
        margin-left: 4px;
      }

      &.is-open {
        flex-direction: column-reverse;

        .hint-actions {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          margin-bottom: 8px;
          margin-left: 0;
        }
      }
    }
  }

  .hint-content {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .hint-actions {
    flex-shrink: 0;
    margin-left: 16px;
  }

  .hint {
    transition: 0.7s;

    &.closed:hover {
      cursor: pointer;
    }
  }

  .hint-view-text {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 42px;
    padding: 0 4px;
    overflow: hidden;
    border-radius: 4px;
  }

  .hint-view-editor {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .hint-editor-button {
    justify-content: center;
    width: 100%;
    padding: 11px 16px !important;
    margin-top: 10px;
    line-height: unset !important;
    border-radius: 4px !important;
  }

  .add-hint-btn-content {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
  }

</style>
