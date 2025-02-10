<template>

  <div>
    <div class="grey--text mb-3 text--darken-1">
      {{ $tr('hintsLabel') }}
    </div>
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
            <VLayout align-top>
              <VFlex
                xs1
                :style="{ 'margin-top': '10px' }"
              >
                {{ hintIdx + 1 }}
              </VFlex>

              <VFlex xs7>
                <transition name="fade">
                  <keep-alive :max="5">
                    <MarkdownViewer
                      v-if="!isHintOpen(hintIdx)"
                      :markdown="hint.hint"
                    />

                    <MarkdownEditor
                      v-else
                      analyticsLabel="Hint"
                      :markdown="hint.hint"
                      :handleFileUpload="handleFileUpload"
                      :getFileUpload="getFileUpload"
                      :imagePreset="imagePreset"
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

    <VBtn
      color="greyBackground"
      class="ml-0 mt-3"
      data-test="newHintBtn"
      @click="addNewHint"
    >
      {{ $tr('newHintBtnLabel') }}
    </VBtn>
  </div>

</template>

<script>

  import AssessmentItemToolbar from '../AssessmentItemToolbar';
  import { AssessmentItemToolbarActions } from '../../constants';
  import { swapElements } from 'shared/utils/helpers';

  import MarkdownEditor from 'shared/views/MarkdownEditor/MarkdownEditor/MarkdownEditor';
  import MarkdownViewer from 'shared/views/MarkdownEditor/MarkdownViewer/MarkdownViewer';

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
      MarkdownEditor,
      MarkdownViewer,
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
      // Inject function to handle file uploads
      handleFileUpload: {
        type: Function,
        default: () => {},
      },
      // Inject function to get file upload object
      getFileUpload: {
        type: Function,
        default: () => {},
      },
      imagePreset: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        toolbarIconActions: [
          AssessmentItemToolbarActions.MOVE_ITEM_UP,
          AssessmentItemToolbarActions.MOVE_ITEM_DOWN,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
      };
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
            hint => hint.hint !== undefined && hint.hint.trim() !== ''
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
      hintsLabel: 'Hints',
      noHintsPlaceholder: 'Question has no hints',
      newHintBtnLabel: 'New hint',
    },
  };

</script>

<style lang="scss" scoped>

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

</style>
