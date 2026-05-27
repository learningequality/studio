<template>

  <div>
    <div
      class="hints-header"
      @click="sectionOpen = !sectionOpen"
    >
      <div class="hints-header-content">
        <span class="hints-label">
          {{ $tr('hintsLabel') }}
        </span>
        <KIcon
          icon="dropdown"
          class="hints-chevron"
          :style="{ transform: sectionOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '24px' }"
        />
      </div>
      <VDivider class="full-width-divider" />
    </div>

    <div
      v-if="sectionOpen"
      class="mt-4"
    >
      <div>
        <div
          v-if="!hints || !hints.length"
          class="card-border-light pa-3"
        >
          {{ $tr('noHintsPlaceholder') }}
        </div>
        <div
          v-for="(hint, hintIdx) in hints"
          :key="hintIdx"
          class="card-border-light"
          data-test="hint"
          @click="onHintClick($event, hintIdx)"
        >
          <VCard
            flat
            :class="hintClasses(hintIdx)"
          >
            <VCardText :class="{ 'pt-0 pb-0': !isHintOpen(hintIdx) }">
              <!-- Touch device & desktop layout with toolbar above -->
              <template v-if="isTouchDevice || screenSizeLevel <= 3">
                <VLayout class="mb-2">
                  <VSpacer />
                  <VFlex shrink>
                    <AssessmentItemToolbar
                      :iconActionsConfig="toolbarIconActions"
                      :canMoveUp="!isHintFirst(hintIdx)"
                      :canMoveDown="!isHintLast(hintIdx)"
                      class="toolbar"
                      analyticsLabel="Hint"
                      @click="onToolbarClick($event, hintIdx)"
                    />
                  </VFlex>
                </VLayout>
                <VLayout>
                  <VFlex xs12>
                    <!-- View mode: plain text-input-like display -->
                    <div
                      v-if="!isHintOpen(hintIdx)"
                      class="hint-view-text"
                    >
                      <span :style="isHintEmpty(hint) ? hintPlaceholderStyle : {}">
                        {{ hintDisplayText(hint, hintIdx) }}
                      </span>
                    </div>
                    <!-- Edit mode: TipTapEditor -->
                    <keep-alive
                      v-else
                      :max="5"
                    >
                      <TipTapEditor
                        v-model="hint.hint"
                        mode="edit"
                        :image-processor="EditorImageProcessor"
                        minHeight="80px"
                        @update="updateHintText($event, hintIdx)"
                        @minimize="emitClose"
                      />
                    </keep-alive>
                  </VFlex>
                </VLayout>
              </template>

              <!-- Desktop layout -->
              <VLayout
                v-else
                align-top
              >
                <VFlex xs10>
                  <transition name="fade">
                    <!-- View mode: plain text-input-like display -->
                    <div
                      v-if="!isHintOpen(hintIdx)"
                      class="hint-view-text"
                      :style="hintViewTextStyle"
                    >
                      <span :style="isHintEmpty(hint) ? hintPlaceholderStyle : {}">
                        {{ hintDisplayText(hint, hintIdx) }}
                      </span>
                    </div>
                    <!-- Edit mode: TipTapEditor -->
                    <keep-alive
                      v-else
                      :max="5"
                    >
                      <TipTapEditor
                        v-model="hint.hint"
                        mode="edit"
                        :image-processor="EditorImageProcessor"
                        minHeight="80px"
                        @update="updateHintText($event, hintIdx)"
                        @minimize="emitClose"
                      />
                    </keep-alive>
                  </transition>
                </VFlex>

                <VSpacer />

                <VFlex>
                  <AssessmentItemToolbar
                    :iconActionsConfig="toolbarIconActions"
                    :canMoveUp="!isHintFirst(hintIdx)"
                    :canMoveDown="!isHintLast(hintIdx)"
                    class="toolbar"
                    analyticsLabel="Hint"
                    @click="onToolbarClick($event, hintIdx)"
                  />
                </VFlex>
              </VLayout>
            </VCardText>
          </VCard>
        </div>
      </div>

      <KButton
        :text="$tr('newHintBtnLabel')"
        class="hint-editor-button"
        :style="{ border: `1px dashed ${$themePalette.grey.v_400}` }"
        icon="plus"
        data-test="newHintBtn"
        appearance="flat-button"
        :appearanceOverrides="buttonAppearanceOverrides"
        @click="addNewHint"
      />
    </div>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import AssessmentItemToolbar from '../AssessmentItemToolbar';
  import { AssessmentItemToolbarActions } from '../../constants';
  import { swapElements } from 'shared/utils/helpers';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';
  import { isTouchDevice } from 'shared/utils/browserInfo';

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
          AssessmentItemToolbarActions.MOVE_ITEM_UP,
          AssessmentItemToolbarActions.MOVE_ITEM_DOWN,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
        EditorImageProcessor,
        isTouchDevice,
      };
    },
    computed: {
      screenSizeLevel() {
        const { windowBreakpoint } = useKResponsiveWindow();
        return windowBreakpoint.value ?? 0;
      },
      buttonAppearanceOverrides() {
        return {
          backgroundColor: this.$themePalette.grey.v_50,
          color: `${this.$themePalette.grey.v_700} !important`,
          fontSize: '14px',
          fontWeight: '600',
          textTransform: 'none',
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_100,
          },
        };
      },
      hintPlaceholderStyle() {
        return {
          color: this.$themePalette.grey.v_600,
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
    cursor: pointer;
    user-select: none;
  }

  .hints-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 0;
  }

  .hints-label {
    /* stylelint-disable-next-line declaration-property-value-disallowed-list */
    font-size: 12px;
    font-weight: 600;
  }

  .hints-chevron {
    transition: transform 0.2s ease;
  }

  .card-border-light {
    /* stylelint-disable-next-line custom-property-pattern */
    border: 1px solid var(--v-greyBorder-lighten1);

    &:not(:first-child) {
      border-top: 0;
    }
  }

  .hint {
    transition: 0.7s;

    &.closed:hover {
      cursor: pointer;
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-greyBackground-lighten1);
    }
  }

  .hint-view-text {
    min-height: 52px;
    padding: 10px 4px;
    border-radius: 4px;
  }

  .hint-editor-button {
    width: 100%;
    margin-top: 10px;
  }

</style>
