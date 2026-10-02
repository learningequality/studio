import { inject, provide } from 'vue';

const PassageSelectionSymbol = Symbol('inlineChoicePassageSelection');

export function providePassageSelection(selection) {
  provide(PassageSelectionSymbol, selection);
}

export function injectPassageSelection() {
  return inject(PassageSelectionSymbol);
}
