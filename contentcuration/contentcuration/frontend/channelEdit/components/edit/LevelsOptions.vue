<template>

  <VSelect
    ref="level"
    v-model="level"
    :items="levels"
    box
    chips
    clearable
    :label="$tr('levelLabel')"
    multiple
    deletableChips
  >
    <template v-slot:no-data>
      <VListTile v-if="levelText && levelText.trim()">
        <VListTileContent>
          <VListTileTitle>
            {{ $tr('noLevelsFoundText', { text: levelText.trim() }) }}
          </VListTileTitle>
        </VListTileContent>
      </VListTile>
    </template>
  </VSelect>

</template>

<script>

  export default {
    name: 'LevelsOptions',
    props: {
      levels: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        levelText: null,
      };
    },
    computed: {
      level: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        }
      }
    },
    $trs: {
      levelLabel: 'Level',
      noLevelsFoundText: 'No results found for "{text}". Press \'Enter\' key to create a new level',
    },
  };

</script>
<style lang="scss">

</style>
