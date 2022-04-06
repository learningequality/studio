<template>
  <VAutocomplete
    v-model="screen_reader"
    class="language-dropdown"
    label="Screen Reader"
    box
    v-bind="$attrs"
    :items="[{ text: 'JAWS' }, { text: 'NVDA' }, { text: 'Narrator' }]"
    color="primary"
    itemValue="id"
    autoSelectFirst
    :allowOverflow="false"
    :search-input.sync="input"
    clearable
    @change="input = ''"
    @focus="$emit('focus')"
  >
  </VAutocomplete>
</template>

<script>
export default {
  name: 'ValidatedForDropDown',
  data() {
    return {
      input: '',
    };
  },
  computed: {
    screen_reader: {
      get() {
        return '{screen_reader}';
      },
      set(value) {
        this.$emit('input', '{screen_reader}');
      },
    },
  }
};
</script>