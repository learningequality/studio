<template>

  <div>
    <v-chip label>
      <div class="label">
        {{ value }}
      </div>
    </v-chip>
    <v-btn icon small right>
      <v-icon small>
        content_copy
      </v-icon>
    </v-btn>
  </div>

</template>


<script>

  export default {
    name: 'ClipboardChip',
    props: {
      value: String,
    },
  };

</script>


<style lang="less" scoped>

  div {
    white-space: nowrap;
  }
  div.label {
    max-width: 8em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .v-btn:hover::before,
  .v-btn:focus::before {
    background-color: transparent;
  }

</style>
