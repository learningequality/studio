/**
 * Convert nodes a format accepted by API:
 * - make sure that empty extra fields are an empty dictionary
 * - convert assessment items answers and hints to strings
 * - save node id to all assessment items
 */
export const prepareNodesForSave = nodes => {
  if (!nodes) {
    return [];
  }

  return nodes.map(node => {
    let assessmentItems = [];
    if (node.assessment_items) {
      assessmentItems = node.assessment_items.map(item => {
        let answers = '[]';
        let hints = '[]';

        if (item.answers) {
          answers = JSON.stringify(item.answers);
        }

        if (item.hints) {
          hints = JSON.stringify(item.hints);
        }

        return {
          ...item,
          contentnode: node.id,
          answers,
          hints,
        };
      });
    }

    return {
      ...node,
      extra_fields: node.extra_fields || {},
      assessment_items: assessmentItems,
    };
  });
};
