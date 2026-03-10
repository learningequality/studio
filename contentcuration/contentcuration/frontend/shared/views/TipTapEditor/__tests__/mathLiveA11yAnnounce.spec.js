jest.mock('shared/i18n', () => ({
  createTranslator: (namespace, messages) => {
    // Return a mock translator that produces Spanish translations
    const spanishMap = {
      deleted: 'eliminado: ',
      selected: 'seleccionado: ',
      startOf: ({ relationName }) => `inicio de ${relationName}: `,
      endOf: ({ spokenText, relationName }) => `${spokenText}; fin de ${relationName}`,
      outOf: ({ relationName }) => `fuera de ${relationName};`,
      endOfMathfield: ({ spokenText }) => `${spokenText}; fin del campo matemático`,
      fraction: 'fracción',
      numerator: 'numerador',
      denominator: 'denominador',
      superscript: 'superíndice',
      subscript: 'subíndice',
      squareRoot: 'raíz cuadrada',
      index: 'índice',
      accented: 'acentuado',
      array: 'matriz',
      box: 'caja',
      chemicalFormula: 'fórmula química',
      delimiter: 'delimitador',
      crossOut: 'tachado',
      extensibleSymbol: 'símbolo extensible',
      error: 'error',
      first: 'primero',
      group: 'grupo',
      latex: 'LaTeX',
      line: 'línea',
      subscriptSuperscript: 'subíndice-superíndice',
      operator: 'operador',
      overUnder: 'sobre-bajo',
      placeholder: 'marcador',
      rule: 'regla',
      space: 'espacio',
      spacing: 'espaciado',
      text: 'texto',
      prompt: 'indicación',
      mathField: 'campo matemático',
      mathfield: 'campo matemático',
      parent: 'padre',
      radicand: 'radicando',
      superscriptAndSubscript: 'superíndice y subíndice',
    };
    const translator = {};
    for (const [key] of Object.entries(messages)) {
      const spanish = spanishMap[key];
      if (spanish !== undefined) {
        translator[`${key}$`] = typeof spanish === 'function' ? spanish : () => spanish;
      }
    }
    return translator;
  },
}));

const { localizeAnnouncement } = require('../TipTapEditor/components/math/mathLiveA11yLocalize');

describe('localizeAnnouncement', () => {
  describe('action prefixes', () => {
    it('translates "deleted: " prefix', () => {
      const result = localizeAnnouncement('deleted: x');
      expect(result).toBe('eliminado: x');
    });

    it('translates "selected: " prefix', () => {
      const result = localizeAnnouncement('selected: x+y');
      expect(result).toBe('seleccionado: x+y');
    });
  });

  describe('navigation announcements', () => {
    it('translates "start of fraction: "', () => {
      const result = localizeAnnouncement('start of fraction: ');
      expect(result).toBe('inicio de fracción: ');
    });

    it('translates trimmed "start of fraction:" (no trailing space)', () => {
      const result = localizeAnnouncement('start of fraction:');
      expect(result).toBe('inicio de fracción: ');
    });

    it('translates "end of fraction"', () => {
      const result = localizeAnnouncement('2; end of fraction');
      expect(result).toBe('2; fin de fracción');
    });

    it('translates "end of mathfield"', () => {
      const result = localizeAnnouncement('x; end of mathfield');
      expect(result).toBe('x; fin del campo matemático');
    });

    it('translates "out of fraction;"', () => {
      const result = localizeAnnouncement('out of fraction;');
      expect(result).toBe('fuera de fracción;');
    });
  });

  describe('relation names', () => {
    it('translates "numerator" in context', () => {
      const result = localizeAnnouncement('start of numerator: ');
      expect(result).toBe('inicio de numerador: ');
    });

    it('translates "denominator" in context', () => {
      const result = localizeAnnouncement('start of denominator: ');
      expect(result).toBe('inicio de denominador: ');
    });

    it('translates "superscript" in context', () => {
      const result = localizeAnnouncement('start of superscript: ');
      expect(result).toBe('inicio de superíndice: ');
    });

    it('translates "subscript" in context', () => {
      const result = localizeAnnouncement('out of subscript;');
      expect(result).toBe('fuera de subíndice;');
    });

    it('translates "square root" in context', () => {
      const result = localizeAnnouncement('start of square root: ');
      expect(result).toBe('inicio de raíz cuadrada: ');
    });

    it('translates "radicand" in context', () => {
      const result = localizeAnnouncement('start of radicand: ');
      expect(result).toBe('inicio de radicando: ');
    });

    it('translates "superscript and subscript" in context', () => {
      const result = localizeAnnouncement('start of superscript and subscript: ');
      expect(result).toBe('inicio de superíndice y subíndice: ');
    });

    it('translates "math field" (two words, as returned by mathlive relationName)', () => {
      const result = localizeAnnouncement('out of math field;');
      expect(result).toBe('fuera de campo matemático;');
    });
  });

  describe('compound announcements', () => {
    it('translates multiple "out of" in sequence', () => {
      const result = localizeAnnouncement('out of numerator;out of fraction;');
      expect(result).toBe('fuera de numerador;fuera de fracción;');
    });

    it('translates "out of" followed by "start of"', () => {
      const result = localizeAnnouncement('out of numerator;start of denominator: ');
      expect(result).toBe('fuera de numerador;inicio de denominador: ');
    });
  });

  describe('trailing whitespace preservation', () => {
    it('preserves trailing \\u00A0 whitespace hack from mathlive', () => {
      const result = localizeAnnouncement('start of fraction:  \u00A0 ');
      expect(result).toBe('inicio de fracción:  \u00A0 ');
    });

    it('preserves trailing \\u202F whitespace hack from mathlive', () => {
      const result = localizeAnnouncement('deleted: x \u202F ');
      expect(result).toBe('eliminado: x \u202F ');
    });
  });

  describe('passthrough', () => {
    it('returns text unchanged when no patterns match', () => {
      const result = localizeAnnouncement('some other text');
      expect(result).toBe('some other text');
    });

    it('handles empty string', () => {
      const result = localizeAnnouncement('');
      expect(result).toBe('');
    });
  });
});
