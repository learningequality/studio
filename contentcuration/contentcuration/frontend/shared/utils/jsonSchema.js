import Ajv from 'ajv';

const ajv = new Ajv({
  keywords: [
    {
      keyword: '$exportConstants',
      schemaType: 'string',
    },
  ],
});

export function compile(schema) {
  return ajv.compile(schema);
}
