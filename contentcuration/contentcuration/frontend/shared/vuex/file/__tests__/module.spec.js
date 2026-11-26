import { mount } from '@vue/test-utils';
import JSZip from 'jszip';
import {
  cancelQtiReload,
  finishQtiLoad,
  markQtiLoadStart,
  requestQtiReload,
} from '../../../../channelEdit/vuex/assessmentItem/qtiReload';
import * as fileUtils from '../utils';
import { FormatPresetsNames } from 'shared/leUtils/FormatPresets';
import { reloadBrowser } from 'shared/utils/navigation';
import storeFactory from 'shared/vuex/baseStore';
import Uploader from 'shared/views/files/Uploader';
import { File, injectVuexStore } from 'shared/data/resources';
import client from 'shared/client';
import { mockChannelScope, resetMockChannelScope } from 'shared/utils/testing';

jest.mock('shared/vuex/connectionPlugin');
jest.mock('shared/utils/navigation', () => ({ reloadBrowser: jest.fn() }));

const { getH5PMetadata } = fileUtils;

const contentnode = 'testnode';
window.storageBaseUrl = 'www.test.com/';

const testFile = {
  original_filename: 'document.pdf',
  url: 'path/to/document.pdf',
  checksum: 'checksum',
  file_size: 100,
  preset: 'document',
  contentnode,
};

const userId = 'some user';

function get_metadata_file(data) {
  const manifest = {
    h5p: '1.0',
    mainLibrary: 'content',
    libraries: [
      {
        machineName: 'content',
        majorVersion: 1,
        minorVersion: 0,
      },
    ],
    content: {
      library: 'content',
    },
    ...data,
  };
  const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const manifestFile = new global.File([manifestBlob], 'h5p.json', { type: 'application/json' });
  return manifestFile;
}

describe('file store', () => {
  let store;
  let id;
  beforeEach(async () => {
    await mockChannelScope('test-123');
    jest.spyOn(File, 'fetchCollection').mockImplementation(() => Promise.resolve([testFile]));
    jest.spyOn(File, 'fetchModel').mockImplementation(() => Promise.resolve(testFile));
    store = storeFactory();
    injectVuexStore(store);
    store.state.session.currentUser.id = userId;
    return File.add(testFile).then(newId => {
      id = newId;
      store.commit('file/ADD_FILE', { id, ...testFile });
    });
  });
  afterEach(async () => {
    await resetMockChannelScope();
    jest.restoreAllMocks();
    injectVuexStore();
    return File.table.toCollection().delete();
  });
  describe('file getters', () => {
    it('tracks pending and failed uploads', () => {
      const progress = { id, loaded: 10, total: 10 };
      store.commit('file/ADD_FILE', progress);
      expect(store.getters['file/filesAreUploading']).toBe(false);
      store.commit('file/ADD_FILE', { ...progress, loaded: 0 });
      expect(store.getters['file/filesAreUploading']).toBe(true);
      store.commit('file/ADD_FILE', { id, error: 'failed' });
      expect(store.getters['file/filesAreUploading']).toBe(false);
    });

    it('tracks an upload while hashing and clears it after a hash failure', async () => {
      let rejectHash;
      const hash = jest.spyOn(fileUtils, 'getHash').mockReturnValue(
        new Promise((resolve, reject) => {
          rejectHash = reject;
        }),
      );
      const file = new window.File(['content'], 'document.pdf');
      const upload = store.dispatch('file/uploadFile', { file });
      await Promise.resolve();
      expect(hash).toHaveBeenCalledWith(file);
      expect(store.getters['file/filesAreUploading']).toBe(true);
      rejectHash(new Error('hash failed'));
      const { uploadPromise } = await upload;
      await expect(uploadPromise).rejects.toBeDefined();
      expect(store.getters['file/filesAreUploading']).toBe(false);
    });

    it('getContentNodeFileById', () => {
      const file = store.getters['file/getContentNodeFileById'](contentnode, id);
      expect(file.id).toEqual(id);
      expect(file.preset.id).toBe('document');
    });
    it('contentNodesTotalSize', () => {
      const file = {
        id: 'test',
        preset: 'document_thumbnail',
        file_size: 100,
        checksum: 'checksum-1',
        contentnode,
      };
      const file2 = {
        id: 'test2',
        preset: 'epub',
        file_size: 100,
        checksum: 'checksum-2',
        contentnode,
      };
      store.commit('file/REMOVE_FILE', { id, ...testFile });
      store.commit('file/ADD_FILES', [file, file2]);
      expect(store.getters['file/contentNodesTotalSize']([contentnode])).toBe(200);
    });
  });
  describe('file actions', () => {
    describe('loadFile action', () => {
      it('should call File.get', () => {
        const getSpy = jest.spyOn(File, 'get');
        return store.dispatch('file/loadFile', id).then(() => {
          expect(getSpy).toHaveBeenCalledWith(id);
          getSpy.mockRestore();
        });
      });
      it('should set the returned data to the file state data', () => {
        return store.dispatch('file/loadFile', id).then(() => {
          expect(store.getters['file/getContentNodeFiles'](contentnode)[0].id).toEqual(id);
        });
      });
    });
    describe('loadFiles action', () => {
      it('should call File.where', () => {
        const whereSpy = jest.spyOn(File, 'where');
        return store.dispatch('file/loadFiles').then(() => {
          expect(whereSpy).toHaveBeenCalledWith({});
          whereSpy.mockRestore();
        });
      });
    });
    describe('updateFile action for an existing file', () => {
      it('should call File.update', () => {
        store.commit('file/ADD_FILE', {
          id,
          title: 'test',
        });
        const updateSpy = jest.spyOn(File, 'update');
        return store
          .dispatch('file/updateFile', {
            id,
            error: 'nope',
          })
          .then(() => {
            expect(updateSpy).toHaveBeenCalledWith(id, { error: 'nope' });
            updateSpy.mockRestore();
          });
      });
    });
    describe('upload actions', () => {
      it('holds a QTI reload from a file drop through validation and storage upload', async () => {
        function defer() {
          let resolve;
          const promise = new Promise(done => {
            resolve = done;
          });
          return { promise, resolve };
        }
        const uploadUrl = defer();
        const storagePut = defer();
        const completed = jest.fn();
        const { createObjectURL, revokeObjectURL } = URL;
        const imageUrl = 'blob:dropped-image';
        URL.createObjectURL = jest.fn(() => imageUrl);
        URL.revokeObjectURL = jest.fn();
        const setImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
        let image;
        jest.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (src) {
          if (src === imageUrl) {
            image = this;
          }
          setImageSrc.call(this, src);
        });
        jest.spyOn(fileUtils, 'getHash').mockResolvedValue('00000000000000000000000000000000');
        const requestUrl = jest.spyOn(File, 'uploadUrl').mockReturnValue(uploadUrl.promise);
        const put = jest.spyOn(client, 'put').mockReturnValue(storagePut.promise);
        const sessionClient = jest.requireActual('../../../client').default;
        jest.spyOn(sessionClient, 'get').mockResolvedValue({ data: 0 });
        store.commit('UPDATE_SESSION', { disk_space: 100, disk_space_used: 0 });
        store.registerModule('connection', { state: { online: true } });
        store.commit('SET_UNSAVED_CHANGES', false);
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
        sessionStorage.clear();
        const uploader = mount(Uploader, {
          store,
          propsData: {
            allowDrop: true,
            presetID: FormatPresetsNames.SLIDESHOW_IMAGE,
            uploadCompleteHandler: completed,
          },
        });

        try {
          const load = markQtiLoadStart([contentnode]);
          requestQtiReload(
            { rootState: store.state, rootGetters: store.getters },
            [contentnode],
            load,
          );
          finishQtiLoad(load);
          const file = new window.File(['file'], 'image.png', { type: 'image/png' });
          await uploader.find('[data-test="dropzone"]').trigger('drop', {
            dataTransfer: { files: [file] },
          });
          jest.advanceTimersByTime(2000);
          expect(reloadBrowser).not.toHaveBeenCalled();

          image.dispatchEvent(new Event('load'));
          await jest.advanceTimersByTimeAsync(2000);
          expect(requestUrl).toHaveBeenCalledTimes(1);
          expect(reloadBrowser).not.toHaveBeenCalled();

          uploadUrl.resolve({
            file: { ...testFile, id: 'dropped-file', preset: FormatPresetsNames.SLIDESHOW_IMAGE },
            uploadURL: 'test_url',
          });
          await jest.advanceTimersByTimeAsync(2000);
          expect(put).toHaveBeenCalledTimes(1);
          expect(reloadBrowser).not.toHaveBeenCalled();

          storagePut.resolve();
          await jest.advanceTimersByTimeAsync(2000);
          expect(completed).toHaveBeenCalledTimes(1);
          expect(reloadBrowser).toHaveBeenCalledTimes(1);
        } finally {
          uploader.destroy();
          Object.assign(URL, { createObjectURL, revokeObjectURL });
          cancelQtiReload();
          reloadBrowser.mockClear();
          jest.useRealTimers();
        }
      });

      it('tracks an empty file until the storage PUT settles', async () => {
        const checksum = '00000000000000000000000000000000';
        jest.spyOn(fileUtils, 'getHash').mockResolvedValue(checksum);
        jest.spyOn(File, 'uploadUrl').mockResolvedValue({
          file: { id: 'empty-file' },
          uploadURL: 'test_url',
        });
        let finishPut;
        jest.spyOn(client, 'put').mockReturnValue(
          new Promise(resolve => {
            finishPut = resolve;
          }),
        );

        const { uploadPromise } = await store.dispatch('file/uploadFile', {
          file: new window.File([], 'empty.pdf'),
        });
        expect(store.getters['file/filesAreUploading']).toBe(true);
        finishPut();
        await uploadPromise;
        expect(store.getters['file/filesAreUploading']).toBe(false);
      });

      it('uploadFileToStorage should call client.put with upload url', () => {
        const payload = {
          id: 'file-id',
          file: { id: 'hello' },
          url: 'test_url',
          checksum: '00000000000000000000000000000000',
        };
        return store.dispatch('file/uploadFileToStorage', payload).then(() => {
          expect(client.put.mock.calls[0][0]).toBe(payload.url);
          client.post.mockRestore();
        });
      });
    });
    describe('H5P content file extract metadata', () => {
      it('getH5PMetadata should check for h5p.json file', () => {
        const zip = new JSZip();
        return zip.generateAsync({ type: 'blob' }).then(async function (h5pBlob) {
          await expect(getH5PMetadata(h5pBlob)).rejects.toThrow(
            'h5p.json not found in the H5P file.',
          );
        });
      });
      it('getH5PMetadata should extract metadata from h5p.json', async () => {
        const manifestFile = get_metadata_file({ title: 'Test file' });
        const zip = new JSZip();
        zip.file('h5p.json', manifestFile);
        await zip.generateAsync({ type: 'blob' }).then(async function (h5pBlob) {
          await expect(getH5PMetadata(h5pBlob)).resolves.toEqual({
            title: 'Test file',
          });
        });
      });
      it('getH5PMetadata should not extract und language', async () => {
        const manifestFile = get_metadata_file({ title: 'Test file', language: 'und' });
        const zip = new JSZip();
        zip.file('h5p.json', manifestFile);
        await zip.generateAsync({ type: 'blob' }).then(async function (h5pBlob) {
          await expect(getH5PMetadata(h5pBlob)).resolves.toEqual({
            title: 'Test file',
          });
        });
      });
      it.each([
        ['CC BY', 1],
        ['CC BY-SA', 2],
        ['CC BY-ND', 3],
        ['CC BY-NC', 4],
        ['CC BY-NC-SA', 5],
        ['CC BY-NC-ND', 6],
        ['CC0 1.0', 8],
      ])('getH5PMetadata should parse CC license %s', async (licenseName, licenseId) => {
        const manifestFile = get_metadata_file({ title: 'Test file', license: licenseName });
        const zip = new JSZip();
        zip.file('h5p.json', manifestFile);
        await zip.generateAsync({ type: 'blob' }).then(async function (h5pBlob) {
          await expect(getH5PMetadata(h5pBlob)).resolves.toEqual({
            title: 'Test file',
            license: licenseId,
          });
        });
      });
      it.each([
        [{ role: 'Author', name: 'Testing' }, 'author'],
        [{ role: 'Editor', name: 'Testing' }, 'aggregator'],
        [{ role: 'Licensee', name: 'Testing' }, 'copyright_holder'],
        [{ role: 'Originator', name: 'Testing' }, 'provider'],
      ])('getH5PMetadata should parse CC license %s', async (authorObj, field) => {
        const manifestFile = get_metadata_file({ title: 'Test file', authors: [authorObj] });
        const zip = new JSZip();
        zip.file('h5p.json', manifestFile);
        await zip.generateAsync({ type: 'blob' }).then(async function (h5pBlob) {
          await expect(getH5PMetadata(h5pBlob)).resolves.toEqual({
            title: 'Test file',
            [field]: authorObj.name,
          });
        });
      });
      it('getH5PMetadata should not extract Firstname Surname author', async () => {
        const manifestFile = get_metadata_file({
          title: 'Test file',
          authors: [{ name: 'Firstname Surname', role: 'Author' }],
        });
        const zip = new JSZip();
        zip.file('h5p.json', manifestFile);
        await zip.generateAsync({ type: 'blob' }).then(async function (h5pBlob) {
          await expect(getH5PMetadata(h5pBlob)).resolves.toEqual({
            title: 'Test file',
          });
        });
      });
      it('getH5PMetadata should exract metadata from h5p.json', async () => {
        const manifestFile = get_metadata_file({
          title: 'Test file',
          language: 'en',
        });
        const zip = new JSZip();
        zip.file('h5p.json', manifestFile);
        await zip.generateAsync({ type: 'blob' }).then(async function (h5pBlob) {
          await expect(getH5PMetadata(h5pBlob)).resolves.toEqual({
            title: 'Test file',
            language: 'en',
          });
        });
      });
    });
  });
});
