import * as resources from '../../contentcuration/contentcuration/frontend/shared/data/resources';

Object.values(resources).forEach(resource => {
  if (resource.fetchCollection) {
    resource.fetchCollection = () => new Promise();
  }
  if (resource.fetchModel) {
    resource.fetchModel = () => new Promise();
  }
});

export * from '../../contentcuration/contentcuration/frontend/shared/data/resources';
