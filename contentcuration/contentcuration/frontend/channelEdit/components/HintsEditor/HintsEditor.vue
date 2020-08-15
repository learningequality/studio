<template>

  <div>
    <div class="grey--text text--darken-1 mb-3">
      {{ $tr('hintsLabel') }}
    </div>

    <div
      v-if="!hints || !hints.length"
      class="pa-3 card-border-light"
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
              {{ hint.order }}
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
                    :markdown="hint.hint"
                    :handleFileUpload="handleFileUpload"
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
                @click="onToolbarClick($event, hintIdx)"
              />
            </VFlex>
          </VLayout>
        </VCardText>
      </VCard>
    </div>

    <VBtn
      flat
      color="primary"
      class="mt-3 ml-0"
      data-test="newHintBtn"
      @click="addNewHint"
    >
      {{ $tr('newHintBtnLabel') }}
    </VBtn>
  </div>

</template>

<script>

  import { AssessmentItemToolbarActions } from '../../constants';
  import AssessmentItemToolbar from '../AssessmentItemToolbar';
  import { swapElements } from 'shared/utils';

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
      },
      openHintIdx: {
        type: Number,
      },
      // Inject function to handle file uploads
      handleFileUpload: {
        type: Function,
      },
      imagePreset: {
        type: String,
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
      noHintsPlaceholder: 'No hints yet',
      newHintBtnLabel: 'New hint',
    },
  };

</script>

<style lang="less" scoped>

  .hint {
    transition: 0.7s;

    &.closed:hover {
      cursor: pointer;
      background-color: var(--v-grey-lighten3);
    }
  }

</style>
