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
      :style="[!isHintOpen(hintIdx) ? { cursor: 'pointer' } : {}]"
      data-test="hint"
      @click="onHintClick($event, hintIdx)"
    >
      <VCardText>
        <VLayout row>
          <VFlex xs1>
            {{ hint.order }}
          </VFlex>

          <VFlex xs5>
            <p v-if="!isHintOpen(hintIdx)">
              {{ hint.hint }}
            </p>
            <VTextField
              v-else
              :value="hint.hint"
              data-test="editHintTextInput"
              @input="updateHintText($event, hintIdx)"
            />
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
      data-test="newHintBtn"
      @click="addNewHint"
    >
      New hint
    </VBtn>
  </div>
</template>

<script>

  import { AssessmentItemToolbarActions } from '../../constants';
  import { swapElements } from '../../utils';
  import AssessmentItemToolbar from '../AssessmentItemToolbar/AssessmentItemToolbar.vue';

  export default {
    name: 'HintsEditor',
    components: {
      AssessmentItemToolbar,
    },
    model: {
      prop: 'hints',
      event: 'update',
    },
    props: {
      hints: {
        type: Array,
      },
    },
    data() {
      return {
        openHintIdx: null,
      };
    },
    methods: {
      openHint(hintIdx) {
        this.openHintIdx = hintIdx;
      },
      closeHint() {
        this.openHintIdx = null;
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

        if (hintIdx === this.openHintIdx) {
          this.openHintIdx = hintIdx - 1;
        }

        this.emitUpdate(updatedHints);
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

        if (hintIdx === this.openHintIdx) {
          this.openHintIdx = hintIdx + 1;
        }

        this.emitUpdate(updatedHints);
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
        this.closeHint();
      },
      onHintClick(event, hintIdx) {
        if (this.isHintOpen(hintIdx)) {
          return;
        }

        // do not open hint on toolbar click
        if (event.target.closest('.toolbar') !== null) {
          return;
        }

        this.openHint(hintIdx);
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
        let updatedHints = [];

        if (this.hints && this.hints.length) {
          updatedHints = [...this.hints];
        }

        updatedHints.push({
          hint: '',
          order: updatedHints.length + 1,
        });

        this.emitUpdate(updatedHints);
        this.openHint(updatedHints.length - 1);
      },
      updateHintText(newHintText, hintIdx) {
        if (newHintText === this.hints[hintIdx].hint) {
          return;
        }

        const updatedHints = [...this.hints];
        updatedHints[hintIdx].hint = newHintText;

        this.emitUpdate(updatedHints);
      },
      emitUpdate(updatedHints) {
        this.$emit('update', updatedHints);
      },
    },
  };

</script>
