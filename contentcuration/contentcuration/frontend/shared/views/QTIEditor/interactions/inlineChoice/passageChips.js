import { inject, provide } from 'vue';

const PassageChipsSymbol = Symbol('inlineChoicePassageChips');

export function providePassageChips(chips) {
  provide(PassageChipsSymbol, chips);
}

export function injectPassageChips() {
  return inject(PassageChipsSymbol);
}
