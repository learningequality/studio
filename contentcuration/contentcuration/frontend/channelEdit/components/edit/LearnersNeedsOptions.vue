<template>

  <VSelect
    ref="needs"
    v-model="need"
    :items="needs"
    box
    chips
    :label="$tr('learnersNeedsLabel')"
    multiple
    deletableChips
    clearable
  >
    <template v-slot:no-data>
      <VListTile v-if="learnersNeedsText && learnersNeedsText.trim()">
        <VListTileContent>
          <VListTileTitle>
            {{ $tr('noNeedsFoundText', { text: learnersNeedsText.trim() }) }}
          </VListTileTitle>
        </VListTileContent>
      </VListTile>
    </template>
  </VSelect>

</template>

<script>

  export default {
    name: 'LearnersNeedsOptions',
    props: {
      needs: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        learnersNeedsText: null,
        need: '',
      };
    },
    $trs: {
      learnersNeedsLabel: 'What you will need',
      noNeedsFoundText:
       'No results found for "{text}". Press \'Enter\' key to specify a new item learners will need',
    },
  };

</script>
<style lang="scss">

</style>
