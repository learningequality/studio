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
      @click="openHint(hintIdx)"
    >
      <VCardText>
        <VLayout row>
          <VFlex xs1>
            {{ hint.order }}
          </VFlex>

          <VFlex xs10>
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

  export default {
    name: 'HintsEditor',
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
