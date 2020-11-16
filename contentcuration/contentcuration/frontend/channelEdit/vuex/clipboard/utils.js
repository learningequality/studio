import get from 'lodash/get';
import { ClipboardNodeFlag } from './constants';

export function selectionId(id, ancestorId = null) {
  return ancestorId ? `${id}-${ancestorId}` : id;
}

export function idFromSelectionId(selectionId) {
  return selectionId.split('-')[0];
}

export function isLegacyNode(node) {
  return !get(node, ['extra_fields', ClipboardNodeFlag]);
}

export function preloadKey({ parent, ancestorId = '' }) {
  return `${parent}_${ancestorId || ''}`;
}
