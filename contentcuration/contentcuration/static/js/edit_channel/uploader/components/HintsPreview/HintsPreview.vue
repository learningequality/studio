<template>
  <div>
    <div v-if="!hints || !hints.length">
      No hints yet
    </div>

    <div v-else>
      <span
        class="toggle"
        data-test="toggle"
        @click="toggle"
      >
        <span>{{ toggleLabel }}</span>

        <span class="icon">
          <v-icon v-if="isOpen">arrow_drop_down</v-icon>
          <v-icon v-else>arrow_drop_up</v-icon>
        </span>
      </span>

      <VList v-if="isOpen">
        <VListTile
          v-for="(hint, hintIdx) in hints"
          :key="hintIdx"
        >
          <VFlex xs1>
            {{ hint.order }}
          </VFlex>
          <VFlex xs2>
            {{ hint.hint }}
          </VFlex>
        </VListTile>
      </VList>
    </div>
  </div>
</template>

<script>

  export default {
    name: 'HintsPreview',
    props: {
      hints: {
        type: Array,
      },
    },
    data() {
      return {
        isOpen: false,
      };
    },
    computed: {
      toggleLabel() {
        if (this.isOpen) {
          return 'Hide hints';
        }

        if (this.hintsCount === 1) {
          return 'Show 1 hint';
        }

        return `Show ${this.hintsCount} hints`;
      },
      hintsCount() {
        if (!this.hints) {
          return 0;
        }

        return this.hints.length;
      },
    },
    methods: {
      toggle() {
        this.isOpen = !this.isOpen;
      },
    },
  };

</script>

<style lang="less" scoped>
  .toggle {
    text-decoration: underline;
    cursor: pointer;

    .icon {
      position: relative;
      top: 3px;
    }
  }
</style>
