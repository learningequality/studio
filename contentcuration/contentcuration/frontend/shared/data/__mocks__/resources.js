import * as resources from '../resources';

Object.values(resources).forEach(resource => {
  if (resource.fetchCollection) {
    resource.fetchCollection = () => Promise.resolve([]);
  }
  if (resource.fetchModel) {
    resource.fetchModel = () => Promise.resolve({});
  }
});

export * from '../resources';
