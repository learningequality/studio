import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { RolesNames } from 'shared/leUtils/Roles';
import { NEW_OBJECT } from 'shared/constants';

export function parseNode(node, children) {
  const thumbnail_encoding = JSON.parse(node.thumbnail_encoding || '{}');
  const tags = Object.keys(node.tags || {});
  const aggregateValues = {};
  if (node.kind === ContentKindsNames.TOPIC) {
    for (let child of children) {
      aggregateValues['error_count'] =
        (aggregateValues['error_count'] || 0) +
        (child['error_count'] || Number(!child['complete']));
      aggregateValues['resource_count'] =
        (aggregateValues['resource_count'] || 0) +
        (child['resource_count'] || Number(child['kind'] !== ContentKindsNames.TOPIC));
      aggregateValues['total_count'] =
        (aggregateValues['total_count'] || 0) + child['total_count'] + 1;
      aggregateValues['coach_count'] =
        (aggregateValues['coach_count'] || 0) +
        (child['coach_count'] || Number(child['role_visibility'] === RolesNames.COACH));
      aggregateValues['has_updated_descendants'] =
        aggregateValues['has_updated_descendants'] ||
        child['has_updated_descendants'] ||
        (child['changed'] && child['published']);
      aggregateValues['has_new_descendants'] =
        aggregateValues['has_new_descendants'] ||
        child['has_new_descendants'] ||
        (child['changed'] && !child['published']);
    }
  }
  return {
    ...node,
    ...aggregateValues,
    thumbnail_encoding,
    tags,
    isNew: node[NEW_OBJECT],
  };
}
