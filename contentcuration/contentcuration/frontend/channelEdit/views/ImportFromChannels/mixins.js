import { filterTypes } from 'shared/constants';
import { generateSearchMixin } from 'shared/mixins';

const searchFilters = {
  kinds: filterTypes.MULTISELECT,
  resources: filterTypes.BOOLEAN,
  channel_id__in: filterTypes.MULTISELECT,
  languages: filterTypes.MULTISELECT,
  licenses: filterTypes.MULTISELECT,
  coach: filterTypes.BOOLEAN,
  assessments: filterTypes.BOOLEAN,
  created_after: filterTypes.DATE,
};

export const searchMixin = generateSearchMixin(searchFilters);
