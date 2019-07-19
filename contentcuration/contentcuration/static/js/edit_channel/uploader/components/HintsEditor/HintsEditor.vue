<template>
  <div>
    <div class="grey--text text--darken-1 mb-3">
      Hints
    </div>

    <div v-if="!hints || !hints.length">
      No hints yet
    </div>

    <VCard
      v-for="(hint, hintIdx) in hints"
      :key="hintIdx"
      :style="cardStyle(hintIdx)"
      flat
      data-test="hint"
      @click="onHintClick($event, hintIdx)"
    >
      <VCardText>
        <!-- eslint-disable-next-line -->
        <VLayout align-top justify-space-between>
          <VFlex xs1>
            {{ hint.order }}
          </VFlex>

          <VFlex xs4 md6 lg7>
            <p v-if="!isHintOpen(hintIdx)">
              {{ hint.hint }}
            </p>

            <keep-alive :max="5">
              <MarkdownEditor
                v-if="isHintOpen(hintIdx)"
                :markdown="hint.hint"
                @update="updateHintText($event, hintIdx)"
              />
            </keep-alive>
          </VFlex>

          <VSpacer />

          <AssessmentItemToolbar
            :displayMenu="false"
            :displayEditIcon="false"
            :canMoveUp="!isHintFirst(hintIdx)"
            :canMoveDown="!isHintLast(hintIdx)"
            class="toolbar"
            @click="onToolbarClick($event, hintIdx)"
          />
        </VLayout>
      </VCardText>
    </VCard>

    <VBtn
      flat
      color="primary"
      class="mt-3 ml-0"
      data-test="newHintBtn"
      @click="addNewHint"
    >
      New hint
    </VBtn>
  </div>
</template>

<script>

  import { AssessmentItemToolbarActions } from '../../constants';
  import { swapElements, sanitizeAssessmentItemHints } from '../../utils';

  import AssessmentItemToolbar from '../AssessmentItemToolbar/AssessmentItemToolbar.vue';
  import MarkdownEditor from '../MarkdownEditor/MarkdownEditor.vue';

  export default {
    name: 'HintsEditor',
    components: {
      AssessmentItemToolbar,
      MarkdownEditor,
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
      cardStyle(hintIdx) {
        const style = {
          border: '1px #d2d2d2 solid',
          marginTop: '-1px',
        };

        if (!this.isHintOpen(hintIdx)) {
          style.cursor = 'pointer';
        }

        return style;
      },
      moveHintUp(hintIdx) {
        if (this.isHintFirst(hintIdx)) {
          return;
        }

        let updatedHints = swapElements(this.hints, hintIdx, hintIdx - 1);
        updatedHints = updatedHints.map((hint, hintIdx) => {
          return {
            ...hint,
            order: hintIdx + 1,
          };
        });

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
        updatedHints = updatedHints.map((hint, hintIdx) => {
          return {
            ...hint,
            order: hintIdx + 1,
          };
        });

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
        updatedHints = updatedHints.map((hint, hintIdx) => {
          return {
            ...hint,
            order: hintIdx + 1,
          };
        });

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
        // primarily to disable adding more empty hints
        const updatedHints = sanitizeAssessmentItemHints(this.hints, true);

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
  };

</script>
