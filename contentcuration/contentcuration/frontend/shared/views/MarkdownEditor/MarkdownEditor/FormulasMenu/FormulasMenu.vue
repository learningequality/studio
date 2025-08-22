<template>

  <div class="formulas-menu">
    <div :class="anchorArrowClasses"></div>

    <VCard elevation="20">
      <VCardTitle class="pb-1 pt-1">
        <VLayout
          align-center
          justify-space-between
        >
          <VFlex class="font-weight-bold">
            {{ $tr('formulasMenuTitle') }}
          </VFlex>
          <VBtn @click="onInsertClick">
            {{ $tr('btnLabelInsert') }}
          </VBtn>
        </VLayout>
      </VCardTitle>

      <VCardText class="pa-0">
        <VDivider class="mt-0" />

        <div class="pa-3 symbol-editor text-center">
          <Formula
            ref="symbolEditor"
            :value="value"
            :editable="true"
            :mathQuill="mathQuill"
            @input="onSymbolEditorInput"
          />
        </div>

        <VDivider class="mb-0" />

        <div class="grey info-bar lighten-3 pa-2">
          {{ infoText }}
        </div>

        <div class="pa-2 symbols-list">
          <div
            v-for="(symbolsGroup, symbolsGroupIdx) in symbols"
            :key="symbolsGroupIdx"
            class="mt-3"
          >
            <div class="font-weight-bold mb-2 pa-2">
              {{ symbolsTranslator.$tr(symbolsGroup.title) }}
            </div>

            <VLayout
              row
              wrap
            >
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
  </div>

</template>


<script>

  import Formula from '../../../Formula';
  import SYMBOLS from './symbols.json';
  import { createTranslator } from 'shared/i18n';

  const ANCHOR_ARROW_SIDE_LEFT = 'left';
  const ANCHOR_ARROW_SIDE_RIGHT = 'right';

  // TODO: I don't think our string extraction will actually
  // catch these generated strings here.

  const symbolsStrings = {};
  SYMBOLS.forEach(symbolsGroup => {
    symbolsStrings[symbolsGroup.title] = symbolsGroup.title;

    symbolsGroup.symbols.forEach(symbol => {
      symbolsStrings[symbol.title] = `${symbol.title} ({ expression })`;
    });
  });
  const symbolsTranslator = createTranslator('SymbolsStrings', symbolsStrings);

  export default {
    name: 'FormulasMenu',
    components: {
      Formula,
    },
    props: {
      value: {
        type: String,
        default: '',
      },
      mathQuill: {
        type: Function,
        default: () => {},
      },
      anchorArrowSide: {
        type: String,
        default: ANCHOR_ARROW_SIDE_LEFT,
        validator: value => {
          return [ANCHOR_ARROW_SIDE_LEFT, ANCHOR_ARROW_SIDE_RIGHT].includes(value);
        },
      },
    },
    data() {
      return {
        symbols: SYMBOLS,
        infoText: '',
      };
    },
    computed: {
      symbolsTranslator() {
        return symbolsTranslator;
      },
      anchorArrowClasses() {
        const classes = ['anchor-arrow'];

        if (this.anchorArrowSide === ANCHOR_ARROW_SIDE_RIGHT) {
          classes.push('anchor-arrow-right');
        }

        return classes;
      },
    },
    mounted() {
      this.$refs.symbolEditor.focus();
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

        this.infoText = this.symbolsTranslator.$tr(symbol.title, { expression: symbol.key });
      },
      onSymbolMouseLeave() {
        this.infoText = '';
      },
      onSymbolEditorInput(formula) {
        this.$emit('input', formula);
      },
      onSymbolClick(symbolsGroupIdx, symbolIdx) {
        const formula = this.symbol(symbolsGroupIdx, symbolIdx).preview;
        this.$emit('input', formula);
      },
      onInsertClick() {
        this.$emit('insert');
      },
    },
    $trs: {
      formulasMenuTitle: 'Special characters',
      btnLabelInsert: 'Insert',
    },
  };

</script>


<style lang="scss" scoped>

  .formulas-menu {
    position: relative;
    max-width: 500px;
    // to make positioning from a parent element easier - this
    // makes sure that the tip of the anchor will be considered
    // as top right/left corner
    margin-top: 16px;
    margin-right: -30px;
    margin-left: -30px;
  }

  .anchor-arrow {
    position: absolute;
    top: -40px;
    left: 10px;
    z-index: 3;
    width: 40px;
    height: 40px;
    overflow: hidden;

    &::after {
      position: absolute;
      top: 28px;
      right: 0;
      left: 6px;
      width: 25px;
      height: 25px;
      content: '';
      background: #ffffff;
      box-shadow: -1px -1px 10px -2px rgba(0, 0, 0, 0.3);
      transform: rotate(45deg);
    }

    &.anchor-arrow-right {
      right: 10px;
      left: initial;
    }
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
    text-align: center;
    cursor: pointer;
    transition: background-color 0.3s ease;

    .mq-math-mode {
      cursor: inherit;
    }

    &.equation {
      font-size: 1.1em;
    }

    &:hover {
      background-color: var(--v-grey-lighten3);
    }
  }

  .mq-focused {
    box-shadow: none;
  }

</style>
