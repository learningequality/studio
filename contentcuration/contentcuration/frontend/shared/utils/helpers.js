import chunk from 'lodash/chunk';
import debounce from 'lodash/debounce';
import memoize from 'lodash/memoize';
import merge from 'lodash/merge';

import { Categories, CategoriesLookup } from 'shared/constants';
import { LicensesList } from 'shared/leUtils/Licenses';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import FormatPresetsMap, { FormatPresetsNames } from 'shared/leUtils/FormatPresets';

function safeParseInt(str) {
  const parsed = parseInt(str);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

const EXTENDED_SLOT = '__extendedSlot';

/**
 * Insert an item into an array before another item.
 * @param {Array} arr
 * @param {Number} idx An index of an item before which
 *                     a new item will be inserted.
 * @param {*} item A new item to be inserted into an array.
 */
export function insertBefore(arr, idx, item) {
  const newArr = JSON.parse(JSON.stringify(arr));
  const insertAt = Math.max(0, idx);
  newArr.splice(insertAt, 0, item);

  return newArr;
}

/**
 * Insert an item into an array after another item.
 * @param {Array} arr
 * @param {Number} idx An index of an item after which
 *                     a new item will be inserted.
 * @param {*} item A new item to be inserted into an array.
 */
export function insertAfter(arr, idx, item) {
  const newArr = JSON.parse(JSON.stringify(arr));
  const insertAt = Math.min(arr.length, idx + 1);
  newArr.splice(insertAt, 0, item);

  return newArr;
}

/**
 * Swap two elements of an array
 * @param {Array} arr
 * @param {Number} idx1
 * @param {Number} idx2
 */
export function swapElements(arr, idx1, idx2) {
  const newArr = JSON.parse(JSON.stringify(arr));
  [newArr[idx1], newArr[idx2]] = [newArr[idx2], newArr[idx1]];

  return newArr;
}

/**
 * Chunks an array of `things`, calling `callback` with `chunkSize` amount of items,
 * expecting callback to return `Promise` that when resolved will allow next chunk to be processed.
 * This then returns a promise that resolves when all promises returned from `callback(chunk)`
 * are resolved.
 *
 * @param {mixed[]} things -- `things` => `chunk`
 * @param {number} chunkSize
 * @param {Function<Promise>} callback
 * @return {Promise<mixed[]>}
 */
export function promiseChunk(things, chunkSize, callback) {
  if (!things.length) {
    return Promise.resolve([]);
  }

  return chunk(things, chunkSize).reduce((promise, thingChunk) => {
    return promise.then(results =>
      callback(thingChunk).then(chunkResults => results.concat(chunkResults)),
    );
  }, Promise.resolve([]));
}

function insertText(doc, fontList, node, x, y, maxWidth, scale, isRtl = false) {
  const style = window.getComputedStyle(node, null);
  const font = fontList[style.getPropertyValue('font-family')]
    ? style.getPropertyValue('font-family')
    : Object.keys(fontList)[0];
  const fontSize = safeParseInt(style.getPropertyValue('font-size')) * scale;
  const fontStyle = style.getPropertyValue('font-style');
  let align = style.getPropertyValue('text-align');
  let fontWeight = style.getPropertyValue('font-weight');

  if (!isNaN(Number(fontWeight))) {
    if (Number(fontWeight) > 400) {
      fontWeight = 'bold';
    } else {
      fontWeight = 'normal';
    }
  } else if (fontWeight === 'bolder') {
    fontWeight = 'bold';
  } else if (fontWeight === 'lighter') {
    fontWeight = 'normal';
  }

  let computedFontStyle;

  if (fontStyle === 'normal') {
    if (fontWeight === 'normal') {
      computedFontStyle = 'normal';
    } else {
      computedFontStyle = 'bold';
    }
  } else {
    if (fontWeight === 'normal') {
      computedFontStyle = 'italic';
    } else {
      computedFontStyle = 'bolditalic';
    }
  }

  if (align === 'start') {
    align = isRtl ? 'right' : 'left';
  } else if (align === 'end') {
    align = isRtl ? 'left' : 'right';
  }

  doc.setFont(font, computedFontStyle);
  doc.setFontSize(fontSize);
  doc.text(node.innerText.trim(), scale * x, scale * y, {
    baseline: 'top',
    maxWidth: maxWidth * scale,
    align,
  });
}

function getContainedSize(img) {
  const ratio = img.naturalWidth / img.naturalHeight;
  let width = img.height * ratio;
  let height = img.height;
  if (width > img.width) {
    width = img.width;
    height = img.width / ratio;
  }
  return [width, height];
}

export function fitToScale(boundingRect, scale = 1) {
  // JSPDF doesn't seem to handle coordinates and sizing
  // properly in pixels, so we use the dimensions in points here
  // and scale from our pixel measurements to points.
  // (the other alternative is that rtibbles is completely misunderstanding
  // what the standard DPI they are using is, and hence why it's not working)
  const pageWidth = 612;
  const pageHeight = 792;
  if (pageHeight / scale < boundingRect.height) {
    scale = pageHeight / boundingRect.height;
  }
  if (pageWidth / scale < boundingRect.width) {
    scale = pageWidth / boundingRect.width;
  }
  return scale;
}

export async function generatePdf(
  htmlRef,
  doc = null,
  { save = false, scale = null, filename } = {},
) {
  return require.ensure(['jspdf', 'html2canvas'], require => {
    const format = 'letter';
    const jsPDF = require('jspdf');
    const html2canvas = require('html2canvas');
    const boundingRect = htmlRef.getBoundingClientRect();
    if (!doc) {
      doc = new jsPDF('p', 'pt', format);
    } else {
      doc.addPage(format);
    }
    if (!scale) {
      scale = fitToScale(boundingRect);
    }

    const fontList = doc.getFontList();
    const promises = [];
    function recurseNodes(node) {
      if (node.children.length && !node.attributes['capture-as-image']) {
        [].map.call(node.children, recurseNodes);
      }
      const nodeRect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node, null);
      const paddingLeft = safeParseInt(style.getPropertyValue('padding-left'));
      const marginLeft = safeParseInt(style.getPropertyValue('margin-left'));
      const borderLeft = safeParseInt(style.getPropertyValue('border-left'));
      const paddingTop = safeParseInt(style.getPropertyValue('padding-top'));
      const marginTop = safeParseInt(style.getPropertyValue('margin-top'));
      const borderTop = safeParseInt(style.getPropertyValue('border-top'));
      const x = nodeRect.left - boundingRect.left + paddingLeft + marginLeft + borderLeft;
      const y = nodeRect.top - boundingRect.top + paddingTop + marginTop + borderTop;
      const width = nodeRect.width;
      const height = nodeRect.height;

      // jsPDF currently has issues rendering non-unicode text, so render these as images
      const isText = !node.childElementCount && node.innerText;

      // eslint-disable-next-line no-control-regex
      const isNonUnicode = isText && /[^\u0000-\u00ff]/.test(node.innerText);

      if (node.attributes['capture-as-image']) {
        promises.push(
          html2canvas(node).then(canvas => {
            doc.addImage(
              canvas.toDataURL(),
              'PNG',
              scale * (x - width / 2),
              scale * y,
              scale * width,
              scale * height,
            );
          }),
        );
      } else if (isNonUnicode) {
        promises.push(
          html2canvas(node).then(canvas => {
            doc.addImage(
              canvas.toDataURL(),
              'PNG',
              scale * (x - 8), // Account for padding
              scale * y,
              scale * width,
              scale * height,
            );
          }),
        );
      } else if (isText) {
        insertText(doc, fontList, node, x, y, width, scale);
      } else if (node.tagName === 'IMG') {
        const filename = node.src.split('?')[0];
        const extension = filename.split('.').slice(-1)[0];
        if (extension.toLowerCase() === 'svg') {
          promises.push(
            new Promise(resolve => {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const context = canvas.getContext('2d');
              context.fillStyle = style.getPropertyValue('background-color');
              context.fillRect(0, 0, canvas.width, canvas.height);
              const img = new Image();
              img.onload = function () {
                context.drawImage(img, 0, 0, width, height);
                doc.addImage(
                  canvas.toDataURL(),
                  'PNG',
                  scale * x,
                  scale * y,
                  scale * width,
                  scale * height,
                );
                resolve();
              };
              img.setAttribute('crossorigin', 'anonymous');
              img.src = node.src;
            }),
          );
        } else {
          const [containedWidth, containedHeight] = getContainedSize(node);
          doc.addImage(
            node,
            undefined,
            scale * x,
            scale * y,
            scale * (containedWidth || width),
            scale * (containedHeight || height),
          );
        }
      }
    }
    recurseNodes(htmlRef);
    return Promise.all(promises).then(() => {
      if (save) {
        return doc.save(filename, { returnPromise: true });
      }
      return doc;
    });
  });
}

/**
 * Given an ID or string constant identifier, return the license info

 * @param {Number | String} key A license identifier
 */
export function findLicense(key, defaultValue = {}) {
  const license = LicensesList.find(
    license => license.license_name === key || license.id === parseInt(key, 10),
  );

  return license || defaultValue;
}

/**
 * Creates a function that can be used to request an animation frame as well as cancel it easily.
 *
 * @param {Function} callback
 * @return {Function}
 */
export function animationThrottle(callback) {
  let animationFrameId = null;
  let lastCallback = () => {};

  const throttled = function (...args) {
    lastCallback = () => {
      callback(...args);
      animationFrameId = null;
    };

    if (animationFrameId) {
      return;
    }

    animationFrameId = requestAnimationFrame(() => lastCallback());
  };

  /**
   * Cancels any pending frame request and immediately executes the function with the last args
   */
  throttled.flush = function () {
    throttled.cancel();
    lastCallback();
  };

  /**
   * Cancels any pending frame request
   */
  throttled.cancel = function () {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  return throttled;
}

/**
 * A helper to extend a slot's VNodeData with those passed in, and optionally
 * pass props to the scoped slot. This is useful for a transparent component that
 * doesn't wrap another component with HTML elements, but uses a render function to
 * add onto the slotted component or element.
 *
 * Basic usage:
 *   extendSlot.call(this, 'default', { class: { example: true }, ... }, { [scoped props], ... })
 * Component usage:
 *   Component {
 *     methods: { extendSlot },
 *     render() { return this.extendSlot('default', ...); }
 *   }
 *
 * @param {String} slotName
 * @param {Object} [vNodeData]
 * @param {Object} [scopeProps]
 * @returns {null|VNode}
 */
export function extendSlot(slotName, vNodeData = {}, scopeProps = {}) {
  // Vue exposes both static and scoped slots in `$scopedSlots`
  if (!this.$scopedSlots[slotName]) {
    // If nothing was provided by the slot, then we don't need to do anything
    return null;
  }

  // Scoped slot functions can return arrays of VNodes or a single VNode
  let slotElements = this.$scopedSlots[slotName](scopeProps);
  if (!Array.isArray(slotElements)) {
    slotElements = [slotElements];
  }

  // Filters out text nodes, and anything falsy
  slotElements = slotElements.filter(c => c && (c.tag || c.data.tag));

  if (!slotElements.length) {
    return null;
  } else if (slotElements.length > 1) {
    // This helper requires that a single element be returned
    return null;
  }

  const [element] = slotElements;

  // This is where the magic happens, we merge the passed VNode data into the slot's
  element.data = element.data || {};
  merge(element.data, vNodeData);

  // If it was a scoped slot, the element will update automatically
  if (!this.$slots[slotName]) {
    return element;
  }

  // Must be an update! This forces classes and styles to update,
  // which do not update otherwise
  if (element.data[EXTENDED_SLOT] && element.context) {
    element.context.$nextTick(function () {
      this.$forceUpdate();
    });
  }

  merge(element.data, {
    [EXTENDED_SLOT]: true,
  });

  return element;
}

/*
 * Simple memoize debounce implementation that allows for
 * arbitrary cache resolve with same API as memoize
 * from https://github.com/lodash/lodash/issues/2403#issuecomment-290760787
 */
export function memoizeDebounce(func, wait = 0, options = {}) {
  const mem = memoize(function () {
    return debounce(func, wait, options);
  }, options.resolver);
  return function () {
    mem.apply(this, arguments).apply(this, arguments);
  };
}

/**
 * Remove falsy properties in contentNode boolean maps.
 * This is necessary as in many places we rely on Object.keys() to
 * get the values of a field, but if the value is false, it should not
 * be considered a valid value.
 */
export function cleanBooleanMaps(contentNode) {
  const booleanMapFields = [
    'grade_levels',
    'learner_needs',
    'accessibility_labels',
    'learning_activities',
    'categories',
  ];
  booleanMapFields.forEach(field => {
    if (contentNode[field]) {
      Object.keys(contentNode[field]).forEach(key => {
        if (!contentNode[field][key]) {
          delete contentNode[field][key];
        }
      });
    }
  });
}

/**
 * Copied implementation from Kolibri to have the same categories order.
 * From: https://github.com/learningequality/kolibri/blob/c372cd05ddd105a7688db9e3698dc21b842ac3e5/kolibri/plugins/learn/assets/src/composables/useSearch.js#L77
 */
function getCategoriesTree() {
  const libraryCategories = {};

  const availablePaths = {};

  (Object.values(Categories) || []).map(key => {
    const paths = key.split('.');
    let path = '';
    for (const path_segment of paths) {
      path = path === '' ? path_segment : path + '.' + path_segment;
      availablePaths[path] = true;
    }
  });
  // Create a nested object representing the hierarchy of categories
  for (const value of Object.values(Categories)
    // Sort by the length of the key path to deal with
    // shorter key paths first.
    .sort((a, b) => a.length - b.length)) {
    // Split the value into the paths so we can build the object
    // down the path to create the nested representation
    const ids = value.split('.');
    // Start with an empty path
    let path = '';
    // Start with the global object
    let nested = libraryCategories;
    for (const fragment of ids) {
      // Add the fragment to create the path we examine
      path += fragment;
      // Check to see if this path is one of the paths
      // that is available on this device
      if (availablePaths[path]) {
        // Lookup the human readable key for this path
        const nestedKey = CategoriesLookup[path];
        // Check if we have already represented this in the object
        if (!nested[nestedKey]) {
          // If not, add an object representing this category
          nested[nestedKey] = {
            // The value is the whole path to this point, so the value
            // of the key.
            value: path,
            // Nested is an object that contains any subsidiary categories
            nested: {},
          };
        }
        // For the next stage of the loop the relevant object to edit is
        // the nested object under this key.
        nested = nested[nestedKey].nested;
        // Add '.' to path so when we next append to the path,
        // it is properly '.' separated.
        path += '.';
      } else {
        break;
      }
    }
  }
  return libraryCategories;
}

export function getSortedCategories() {
  const categoriesTree = getCategoriesTree();
  const categoriesSorted = {};
  const sortCategories = function (categories) {
    Object.entries(categories).forEach(([name, category]) => {
      categoriesSorted[category.value] = name;
      sortCategories(category.nested);
    });
  };
  sortCategories(categoriesTree);
  return categoriesSorted;
}

export function isAudioVideoFile(file) {
  if (!file || !file.file_format) {
    return false;
  }

  const videoAllowedFormats = FormatPresetsMap.get(
    FormatPresetsNames.HIGH_RES_VIDEO,
  ).allowed_formats;
  const audioAllowedFormats = FormatPresetsMap.get(FormatPresetsNames.AUDIO).allowed_formats;
  return (
    videoAllowedFormats.includes(file.file_format) || audioAllowedFormats.includes(file.file_format)
  );
}

export function getFileDuration(nodeFiles, kind) {
  if (
    !nodeFiles ||
    !nodeFiles.length ||
    ![ContentKindsNames.AUDIO, ContentKindsNames.VIDEO].includes(kind)
  ) {
    return null;
  }

  // filter for the correct file types,
  // to exclude files such as subtitle or cc
  const audioVideoFiles = nodeFiles.filter(file => isAudioVideoFile(file));
  // return the last item in the array
  const file = audioVideoFiles[audioVideoFiles.length - 1];
  if (!file || !file.duration) {
    return null;
  }
  return file.duration;
}

export function hasMultipleFieldValues(array, field) {
  let value;
  for (const item of array) {
    if (!item[field]) {
      continue;
    }
    if (value === undefined) {
      value = item[field];
    } else if (value !== item[field]) {
      return true;
    }
  }
  return false;
}

export const mapFields = [
  'accessibility_labels',
  'grade_levels',
  'learner_needs',
  'categories',
  'learning_activities',
  'resource_types',
  'tags',
];

export function getMergedMapFields(node, contentNodeData) {
  const mergedMapFields = {};
  for (const mapField of mapFields) {
    if (contentNodeData[mapField]) {
      if (mapField === 'categories') {
        // Reduce categories to the minimal set
        const existingCategories = Object.keys(node.categories || {});
        const newCategories = Object.keys(contentNodeData.categories);
        const newMap = {};
        for (const category of existingCategories) {
          // If any of the new categories are more specific than the existing category,
          // omit this.
          if (!newCategories.some(newCategory => newCategory.startsWith(category))) {
            newMap[category] = true;
          }
        }
        for (const category of newCategories) {
          if (
            !existingCategories.some(
              existingCategory =>
                existingCategory.startsWith(category) && category !== existingCategory,
            )
          ) {
            newMap[category] = true;
          }
        }
        mergedMapFields[mapField] = newMap;
      } else {
        mergedMapFields[mapField] = {
          ...node[mapField],
          ...contentNodeData[mapField],
        };
      }
    }
  }
  return mergedMapFields;
}
