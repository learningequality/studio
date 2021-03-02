import get from 'lodash/get';
import { ClipboardNodeFlag } from './constants';

export function selectionId(id, ancestorId = null) {
  return ancestorId ? `${id}-${ancestorId}` : id;
}

export function isLegacyNode(node) {
  return !get(node, ['extra_fields', ClipboardNodeFlag]);
}

export function isExcludedNode(ancestorNode, node) {
  return get(ancestorNode, ['extra_fields', 'excluded_descendants', node.node_id], false);
}

export function addExcludedNode(ancestorNode, node) {
  const extra_fields = get(ancestorNode, ['extra_fields'], {});
  ancestorNode.extra_fields = {
    ...extra_fields,
    excluded_descendants: {
      ...get(extra_fields, ['excluded_descendants'], {}),
      [node.node_id]: true,
    },
  };
  return ancestorNode;
}
