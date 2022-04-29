<template>

  <VLayout row wrap>
    <VFlex grow>
      <VTextField
        v-model="correctAnswers"
        box
        :label="$tr('correctAnswersLabel')"
      />
    </VFlex>
    <VFlex shrink pl-3 pr-3 pt-2>
      <span style="font-size:1.8em"> / </span>
    </VFlex>
    <VFlex grow>
      <VTextField
        v-model="answers"
        box
        :label="$tr('recentAnswersLabel')"
      />
    </VFlex>
  </VLayout>

</template>

<script>

  export default {
    name: 'PracticeUntilGoalMetActivity',
    props: {},
    data() {
      return {
        answers: '',
        correctAnswers: '',
      };
    },
    computed: {},
    $trs: {
      correctAnswersLabel: 'Correct answers needed',
      recentAnswersLabel: 'Recent answers',
    },
  };

</script>
<style lang="scss">

</style>
