const csrf = global.document.createElement('input');
csrf.name = 'csrfmiddlewaretoken';
csrf.value = 'csrfmiddlewaretoken';
global.document.body.append(csrf);
global.window.Urls = new Proxy({}, {
  get() {
    return () => undefined;
  }
});
