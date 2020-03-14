import { sortBy } from 'underscore';

import unsortedLanguages from './Languages';

export { default as ContentKinds } from './ContentKinds';
export { default as FormatPresets } from './FormatPresets';
export { default as Licenses } from './Licenses';
export { default as MasteryModels } from './MasteryModels';
export { default as Roles } from './Roles';
export { default as Statuses } from './Statuses';

export * from './ContentDefaults';
export const Languages = sortBy(unsortedLanguages, 'native_name');

// This symbol is used in cases where we want to set a default value
// for a symbol but have it be identifiable as a fill in.
export const NOVALUE = Symbol('No value default');
