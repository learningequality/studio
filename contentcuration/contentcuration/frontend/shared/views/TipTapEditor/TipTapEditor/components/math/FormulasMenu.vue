<template>

  <div
    ref="rootEl"
    class="formulas-menu"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    @click.stop
  >
    <div class="card">
      <div class="card-title">
        <div class="title-layout">
          <div
            id="dialog-title"
            class="title-text"
          >
            {{ formulasMenuTitle$() }}
          </div>
          <button
            class="close-button"
            :aria-label="closeModal$()"
            @click="$emit('close')"
          >
            ×
          </button>
        </div>
      </div>

      <div class="card-content">
        <div class="symbol-editor">
          <div
            v-if="!mathLiveLoaded"
            class="loading-placeholder"
          >
            Loading math editor...
          </div>
          <math-field
            v-else
            ref="mathfieldEl"
            aria-label="Math formula editor"
          />
        </div>

        <div
          class="info-bar"
          aria-live="polite"
        >
          {{ infoText }}
        </div>

        <div class="symbols-list">
          <div
            v-for="(symbolsGroup, symbolsGroupIdx) in symbolGroups"
            :key="symbolsGroupIdx"
            class="symbol-group"
          >
            <div class="group-title">
              {{ symbolsGroup.title }}
            </div>

            <div
              class="symbol-grid"
              role="group"
              :aria-label="symbolsGroup.title + ' symbols'"
            >
              <button
                v-for="(symbol, symbolIdx) in symbolsGroup.symbols"
                :key="symbolIdx"
                :class="getSymbolClasses(symbolsGroup, symbolsGroupIdx)"
                class="symbol-button"
                :aria-label="symbol.title"
                @click="onSymbolClick(symbolsGroupIdx, symbolIdx)"
                @mouseenter="onSymbolMouseEnter(symbolsGroupIdx, symbolIdx)"
                @mouseleave="onSymbolMouseLeave"
              >
                <math-field
                  v-if="mathLiveLoaded"
                  read-only
                  tabindex="-1"
                  :value="symbol.preview"
                />
                <span
                  v-else
                  class="symbol-fallback"
                >{{ symbol.preview }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer>
        <button
          class="insert-button"
          :disabled="isFormulaEmpty || !mathLiveLoaded"
          @click="onSave"
        >
          {{ insert$() }}
        </button>
      </footer>
    </div>
  </div>

</template>


<script>

  import { ref, onMounted, defineComponent, computed } from 'vue';
  import { useFocusTrap } from '../../composables/useFocusTrap';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';
  import { useMathLiveLocale } from '../../composables/useMathLiveLocale';
  import { getFormulasStrings } from './FormulasStrings';
  import symbolsData from './symbols.json';

  export default defineComponent({
    setup(props, { emit }) {
      const rootEl = ref(null);
      const mathfieldEl = ref(null);
      const infoText = ref('');
      const mathLiveLoaded = ref(false);

      useFocusTrap(rootEl);

      const currentLatex = ref('');

      // Load MathLive dynamically
      const loadMathLive = async () => {
        try {
          // Dynamic import of mathlive
          await import(/* webpackChunkName: "mathlive" */ 'mathlive');

          mathLiveLoaded.value = true;

          // Configure MathLive after it's loaded
          if (typeof window !== 'undefined' && window.MathfieldElement) {
            window.MathfieldElement.soundsDirectory = null;
            if (window.mathVirtualKeyboard) {
              window.mathVirtualKeyboard.plonkSound = null;
              window.mathVirtualKeyboard.keypressSound = null;
            }
          }

          // Initialize the mathfield after MathLive is loaded
          await initializeMathfield();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to load MathLive:', error);
        }
      };

      const initializeMathfield = async () => {
        // Wait for next tick to ensure the mathfield element is rendered
        await new Promise(resolve => setTimeout(resolve, 0));

        if (mathfieldEl.value) {
          mathfieldEl.value.mathVirtualKeyboardPolicy = 'manual';
          mathfieldEl.value.value = props.initialLatex;
          mathfieldEl.value.focus();
          mathfieldEl.value.addEventListener('input', updateLatex);
          currentLatex.value = props.initialLatex;
        }
      };

      // Watch for changes in the mathfield
      const updateLatex = () => {
        if (mathfieldEl.value && mathLiveLoaded.value) {
          currentLatex.value = mathfieldEl.value.getValue('latex');
        }
      };

      const isFormulaEmpty = computed(() => {
        return !currentLatex.value || currentLatex.value.trim() === '';
      });

      onMounted(() => {
        loadMathLive();
      });

      const getSymbol = (symbolsGroupIdx, symbolIdx) => {
        return symbolGroups.value[symbolsGroupIdx].symbols[symbolIdx];
      };

      const getSymbolClasses = (symbolsGroup, symbolsGroupIdx) => {
        const classes = ['symbol'];

        const originalGroup = symbolsData[symbolsGroupIdx];
        if (
          originalGroup &&
          ['formulasCategory', 'linesCategory'].includes(originalGroup.titleKey)
        ) {
          classes.push('equation');
        }

        return classes.join(' ');
      };

      const onSymbolMouseEnter = (symbolsGroupIdx, symbolIdx) => {
        const symbol = getSymbol(symbolsGroupIdx, symbolIdx);
        infoText.value = `${symbol.title} (${symbol.key})`;
      };

      const onSymbolMouseLeave = () => {
        infoText.value = '';
      };

      const onSymbolClick = (symbolsGroupIdx, symbolIdx) => {
        if (!mathLiveLoaded.value || !mathfieldEl.value) return;

        const symbol = getSymbol(symbolsGroupIdx, symbolIdx);
        const originalGroup = symbolsData[symbolsGroupIdx];
        const valueToInsert =
          originalGroup?.titleKey === 'formulasCategory' && symbol.template
            ? symbol.template
            : symbol.preview;

        mathfieldEl.value.executeCommand(['insert', valueToInsert]);
        mathfieldEl.value.focus();
      };

      const onSave = () => {
        if (mathfieldEl.value && mathLiveLoaded.value) {
          const newLatex = mathfieldEl.value.getValue('latex');
          emit('save', newLatex);
        }
      };

      const { formulasMenuTitle$, insert$, closeModal$ } = getTipTapEditorStrings();
      const formulasStrings = getFormulasStrings();

      // Transform symbols data to use translations
      const symbolGroups = computed(() => {
        return symbolsData.map(group => {
          const translatedTitle = formulasStrings[`${group.titleKey}$`]
            ? formulasStrings[`${group.titleKey}$`]()
            : group.title || group.titleKey;

          return {
            title: translatedTitle,
            symbols: group.symbols.map(symbol => ({
              ...symbol,
              title: formulasStrings[`${symbol.titleKey}$`]
                ? formulasStrings[`${symbol.titleKey}$`]()
                : symbol.title || symbol.titleKey,
            })),
          };
        });
      });

      const currentLocale = ref(navigator.language || 'en');
      useMathLiveLocale(currentLocale);

      return {
        rootEl,
        mathfieldEl,
        mathLiveLoaded,
        symbolGroups,
        infoText,
        getSymbolClasses,
        onSymbolMouseEnter,
        onSymbolMouseLeave,
        onSymbolClick,
        onSave,
        formulasMenuTitle$,
        insert$,
        closeModal$,
        isFormulaEmpty,
      };
    },
    props: {
      initialLatex: {
        type: String,
        default: '',
      },
    },
  });

</script>


<style scoped>

  @import 'mathlive/fonts.css';

  .formulas-menu {
    position: relative;
    width: 90%;
    max-width: 500px;
  }

  .card {
    overflow: hidden;
    background: white;
    border-radius: 8px;
    box-shadow:
      0 10px 20px rgba(0, 0, 0, 0.19),
      0 6px 6px rgba(0, 0, 0, 0.23);
  }

  .card-title {
    position: relative;
    z-index: 5;
    padding: 16px 16px 8px;
  }

  .title-layout {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title-text {
    font-size: 1rem;
    font-weight: 700;
  }

  .card-content {
    position: relative;
  }

  .close-button {
    font-size: 2rem;
    line-height: 1;
    color: black;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .symbol-editor {
    min-height: 20px;
    padding: 12px;
    overflow-x: auto;
    text-align: center;
  }

  .loading-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 80px;
    padding: 8px;
    font-size: 1.2rem;
    color: #666666;
    background-color: #f9f9f9;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  .symbol-editor math-field {
    width: 100%;
    min-height: 80px;
    padding: 8px;
    font-size: 1.7rem;
    font-display: swap;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  .info-bar {
    position: sticky;
    display: flex;
    align-items: center;
    min-height: 36px;
    padding: 8px;
    margin-top: 0.75rem;
    font-size: 0.9rem;
    background-color: #f5f5f5;
  }

  .symbols-list {
    height: 320px;
    padding: 8px;
    overflow-y: auto;
  }

  .symbol-group {
    margin-top: 12px;
  }

  .group-title {
    padding: 8px;
    margin-bottom: 8px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .symbol-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .symbol {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 8px;
    font-family: inherit;
    text-align: center;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 4px;
    transition: background-color 0.3s ease;
  }

  .symbol::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    cursor: pointer;
    content: '';
  }

  .symbol:hover {
    background-color: #f5f5f5;
  }

  .symbol.equation {
    flex-basis: calc(33.333% - 4px);
    font-size: 1.1em;
  }

  .symbol:not(.equation) {
    flex-basis: calc(16.666% - 4px);
    font-size: 1.4em;
  }

  .symbol math-field {
    pointer-events: none;
    background: transparent;
    border: 0;
  }

  .symbol-fallback {
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    color: #666666;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    padding: 1rem;
    border-top: 1px solid #cccccc;
  }

  .insert-button {
    padding: 8px 16px;
    font-weight: 700;
    color: black;
    cursor: pointer;
    background: #e6e6e6;
    border: 1px solid #e0e0e0;
    border-radius: 2px;
  }

  .insert-button:disabled {
    color: #bdbdbd;
    cursor: not-allowed;
    background: #e0e0e0;
  }

</style>
