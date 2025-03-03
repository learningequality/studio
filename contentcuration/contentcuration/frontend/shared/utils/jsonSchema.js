import Ajv from 'ajv';

const ajv = new Ajv({
  keywords: [
    {
      keyword: '$exportConstants',
      schemaType: 'string',
    },
  ],
});

/**
 * Compiles the AJV instance with a JSON schema to get a validation function
 *
 * @param {Object} schema
 * @param {Object[]} dependentSchemas
 * @return {ValidateFunction<bool>}
 */
export function compile(schema, dependentSchemas = null) {
  let instance = ajv;
  // Add dependent schemas to local instance
  if (dependentSchemas) {
    instance = dependentSchemas.reduce(
      (instance, dependentSchema) => instance.addSchema(dependentSchema),
      instance,
    );
  }
  return instance.compile(schema);
}
