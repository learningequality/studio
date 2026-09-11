import { descriptors, editors, registry, DEFAULT_INTERACTION } from '../index';
import { isInlineInteraction } from '../descriptors';
import { Placement } from '../../constants';

/**
 * An interaction is registered in two places: its descriptor in `descriptors.js` and its
 * editor in `index.js`. That split keeps the editors out of the parse/validate import
 * graph, at the cost of two lists that have to agree — so these assert they do. A new
 * interaction that only got half-registered fails here rather than at the moment an author
 * opens the question.
 */
describe('interaction registry', () => {
  it('registers an editor for every descriptor', () => {
    const missing = descriptors.filter(d => !editors[d.type]).map(d => d.type);
    expect(missing).toEqual([]);
  });

  it('registers a descriptor for every editor', () => {
    const orphans = Object.keys(editors).filter(type => !registry[type]);
    expect(orphans).toEqual([]);
  });

  it('holds the same number of descriptors and editors', () => {
    expect(Object.keys(editors)).toHaveLength(descriptors.length);
  });

  it('keys the registry by every descriptor type', () => {
    expect(Object.keys(registry).sort()).toEqual(descriptors.map(d => d.type).sort());
  });

  it('has a descriptor for the fallback interaction', () => {
    expect(registry[DEFAULT_INTERACTION]).toBeDefined();
  });

  describe('isInlineInteraction', () => {
    it('reports the placement each descriptor declares', () => {
      for (const descriptor of descriptors) {
        expect(isInlineInteraction(descriptor.type)).toBe(
          descriptor.placement === Placement.INLINE,
        );
      }
    });

    it('reports an interaction with no descriptor as not inline', () => {
      expect(isInlineInteraction('qti-match-interaction')).toBe(false);
    });
  });
});
