import * as resources from '../resources';

Object.values(resources).forEach(resource => {
  if (resource.requestCollection) {
    resource.requestCollection = () => Promise.resolve([]);
  }
  if (resource.requestModel) {
    resource.requestModel = () => Promise.resolve({});
  }
});

export * from '../resources';
