import client from 'shared/client';

export function loadSampleNodes(context, params) {
  return client.get(window.Urls['healthz'](), { params }).then(response => {
    return response.data;
  });
}
