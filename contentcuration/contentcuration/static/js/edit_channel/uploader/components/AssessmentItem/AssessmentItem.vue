<template>
  <VExpansionPanelContent>
    <template v-slot:header>
      <template v-if="!isOpen">
        <VFlex xs1>
          {{ order }}
        </VFlex>
        <VFlex>
          <div class="caption grey--text mb-1">
            {{ kindLabel }}
          </div>
          <div data-test="questionText">
            {{ question }}
          </div>
        </VFlex>
      </template>

      <template v-else>
        <VFlex xs12>
          {{ order }}
        </VFlex>
      </template>
    </template>

    <VCard>
      <VContainer fluid>
        <VLayout row>
          <VFlex xs5>
            <VSelect
              :items="kindSelectItems"
              :value="kind"
              label="Question type"
              data-test="kindSelect"
              @input="onKindChange"
            />
          </VFlex>
        </VLayout>

        <VLayout row>
          <VFlex>
            <VTextField
              label="Question text"
              :value="question"
              @input="onQuestionChange"
            />
          </VFlex>
        </VLayout>

        <!-- TODO @MisRob: Find out which linter tool is removing
        dashes from Vuetify attributes and disable -->
        <!-- eslint-disable-next-line -->
        <VLayout row mt-3>
          <div class="grey--text text--darken-1 mb-3">
            Answers
          </div>
        </VLayout>

        <!-- eslint-disable-next-line -->
        <VLayout row mb-3>
          <VBtn flat>
            New answer
          </VBtn>
        </VLayout>

        <VDivider />

        <!-- eslint-disable-next-line -->
        <VLayout row mt-3>
          <div class="grey--text text--darken-1 mb-3">
            Hints
          </div>
        </VLayout>

        <VLayout row>
          <VBtn flat>
            New hint
          </VBtn>
        </VLayout>

        <!-- eslint-disable-next-line -->
        <VLayout row justify-end>
          <VBtn
            flat
            color="primary"
            data-test="closeBtn"
            @click="onCloseClick"
          >
            Close
          </VBtn>
        </VLayout>
      </VContainer>
    </VCard>
  </VExpansionPanelContent>
</template>

<script>

  import { AssessmentItemTypes } from '../../constants';

  export default {
    name: 'AssessmentItem',
    props: {
      item: {
        type: Object,
      },
      itemIdx: {
        type: Number,
      },
      isOpen: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      order() {
        if (!this.item || this.item.order === undefined) {
          return 1;
        }

        return this.item.order + 1;
      },
      question() {
        if (!this.item || !this.item.question) {
          return '';
        }

        return this.item.question;
      },
      kind() {
        if (!this.item || !this.item.type) {
          return AssessmentItemTypes.SINGLE_SELECTION;
        }

        return this.item.type;
      },
      kindSelectItems() {
        return [
          { value: AssessmentItemTypes.SINGLE_SELECTION, text: 'Single selection' },
          { value: AssessmentItemTypes.MULTIPLE_SELECTION, text: 'Multiple selection' },
          { value: AssessmentItemTypes.INPUT_QUESTION, text: 'Input question' },
          { value: AssessmentItemTypes.TRUE_FALSE, text: 'True/False' },
        ];
      },
      kindLabel() {
        return this.kindSelectItems.find(item => item.value === this.kind).text;
      },
    },
    methods: {
      onQuestionChange(newQuestion) {
        this.$emit('update', {
          itemIdx: this.itemIdx,
          payload: { question: newQuestion },
        });
      },
      onKindChange(newKind) {
        this.$emit('update', { itemIdx: this.itemIdx, payload: { type: newKind } });
      },
      onCloseClick() {
        this.$emit('close');
      },
    },
  };

</script>
