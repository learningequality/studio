<template>

  <div v-if="!omitted">
    <div
      v-if="loading"
      class="loader-wrapper"
    >
      <KCircularLoader :size="16" />
      {{ $tr('checking') }}
    </div>
    <div v-else-if="finishedLoading">
      <slot></slot>
    </div>
    <div v-else>{{ $tr('error') }}</div>
  </div>
  <div v-else>—</div>

</template>


<script setup>

  defineProps({
    loading: {
      type: Boolean,
      required: true,
    },
    finishedLoading: {
      type: Boolean,
      required: true,
    },
    omitted: {
      type: Boolean,
      required: false,
      default: false,
    },
  });

</script>


<script>

  export default {
    $trs: {
      checking: 'Checking...',
      error: 'Error loading data.',
    },
  };

</script>


<style scoped lang="scss">

  .loader-wrapper {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .loader-wrapper ::v-deep .ui-progress-circular {
    display: inline-block;
    margin: 0;
  }

</style>
