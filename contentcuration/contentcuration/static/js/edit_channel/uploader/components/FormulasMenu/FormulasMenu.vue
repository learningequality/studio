<template>

  <VCard>
    <VCardTitle class="pt-1 pb-1">
      <VLayout align-center justify-space-between>
        <VFlex class="font-weight-bold">
          Special characters
        </VFlex>
        <VFlex xs4>
          <VBtn
            flat
            color="primary"
            @click="onInsertClick"
          >
            Insert
          </VBtn>
        </VFlex>
      </VLayout>
    </VCardTitle>

    <VCardText class="pa-0">
      <VDivider class="mt-0" />

      <div class="symbol-editor pl-3 pr-3 text-center">
        <Formula
          v-if="formula"
          v-model="formula"
          :editable="true"
          :mathQuill="mathQuill"
        />
      </div>

      <VDivider class="mb-0" />

      <div class="info-bar grey lighten-3 pa-2">
        {{ infoText }}
      </div>

      <div class="symbols-list pa-2">
        <div
          v-for="(symbolsGroup, symbolsGroupIdx) in symbols"
          :key="symbolsGroupIdx"
          class="mt-3"
        >
          <div class="pa-2 mb-2 font-weight-bold">
            {{ symbolsGroup.title }}
          </div>

          <VLayout row wrap>
            <VFlex
              v-for="(_, symbolIdx) in symbolsGroup.symbols"
              :key="symbolIdx"
              :class="symbolClasses(symbolsGroup)"
              @click="onSymbolClick(symbolsGroupIdx, symbolIdx)"
              @mouseenter="onSymbolMouseEnter(symbolsGroupIdx, symbolIdx)"
              @mouseleave="onSymbolMouseLeave"
            >
              <Formula
                :value="symbol(symbolsGroupIdx, symbolIdx).preview"
                :mathQuill="mathQuill"
              />
            </VFlex>
          </VLayout>
        </div>
      </div>
    </VCardText>
  </VCard>

</template>

<script>

  import Formula from '../Formula/Formula';
  import SYMBOLS from './symbols.json';

  export default {
    name: 'FormulasMenu',
    components: {
      Formula,
    },
    props: {
      initialFormula: {
        type: String,
        default: '',
      },
      mathQuill: {
        type: Function,
      },
    },
    data() {
      return {
        symbols: SYMBOLS,
        formula: '',
        infoText: '',
      };
    },
    mounted() {
      this.formula = this.initialFormula;
    },
    methods: {
      symbol(symbolsGroupIdx, symbolIdx) {
        return this.symbols[symbolsGroupIdx].symbols[symbolIdx];
      },
      symbolClasses(symbolsGroup) {
        const classes = ['symbol', 'text-center', 'pa-2'];

        if (['Formulas', 'Lines'].includes(symbolsGroup.title)) {
          classes.push('equation');
          classes.push('xs4');
        } else {
          classes.push('xs2');
        }

        return classes;
      },
      onSymbolMouseEnter(symbolsGroupIdx, symbolIdx) {
        const symbol = this.symbol(symbolsGroupIdx, symbolIdx);

        this.infoText = `${symbol.title} (${symbol.key})`;
      },
      onSymbolMouseLeave() {
        this.infoText = '';
      },
      onSymbolClick(symbolsGroupIdx, symbolIdx) {
        this.formula = this.symbol(symbolsGroupIdx, symbolIdx).preview;
      },
      onInsertClick() {
        if (this.formula) {
          this.$emit('insert', this.formula);
        }
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../../less/global-variables.less';

  .v-card {
    z-index: 2;
    min-width: 320px;
    max-width: 500px;
  }

  .v-card__text {
    position: relative;
  }

  .symbol-editor {
    min-height: 20px;
    overflow-x: scroll;
    font-size: 1.3em;
  }

  .info-bar {
    position: sticky;
    z-index: 3;
    min-height: 36px;
  }

  .symbols-list {
    height: 360px;
    overflow-y: scroll;
  }

  .symbol {
    font-size: 1.4em;
    cursor: pointer;
    transition: background-color 0.3s ease;

    .mq-math-mode {
      cursor: inherit;
    }

    &.equation {
      font-size: 1.1em;
    }

    &:hover {
      background-color: @gray-200;
    }
  }

  .mq-focused {
    box-shadow: none;
  }

</style>
