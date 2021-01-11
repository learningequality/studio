/*
 * The service worker for Studio
 * This is very minimal for now, and is only used
 * for precaching of static assets, and to autorefresh to update
 * client side assets when the service worker updates.
 * If you are editing this file, by default it will not be generated or used
 * in develop mode, you must remove the production only block in app.js
 * modify the webpack.config.js to always add the InjectManifest plugin
 * and enable the DEBUG fetching of the service worker Javascript in views/pwa.py
 * Note that if you do this, you will also suffer frequent Javascript memory leak
 * errors during development because of the workbox inject manifest plugin.
 */
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // eslint-disable-next-line no-undef
    skipWaiting();
  }
});
