import { SCHEMA } from 'kolibri-constants/CompletionCriteria';
import { compile } from 'shared/utils/jsonSchema';

/**
 * @type {Function<boolean>|ValidateFunction}
 */
export const validate = compile(SCHEMA);
