export function getApiErrorMessage(error, fallback) {
  const data = error && error.response && error.response.data;
  const message = Array.isArray(data) ? data[0] : null;
  return message || fallback;
}
