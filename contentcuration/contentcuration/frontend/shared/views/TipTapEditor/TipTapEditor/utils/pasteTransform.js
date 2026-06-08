function stripMsoConditionalComments(html) {
  return html.replace(/<!--\[if.*?endif\]-->/gis, '');
}

function stripOfficeNamespacedTags(html) {
  return html.replace(/<\/?(w|m|o|v):[^>]*>/gis, '');
}

function filterMsoStyleDeclarations(doc) {
  doc.querySelectorAll('[style]').forEach(el => {
    const filtered = el
      .getAttribute('style')
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.toLowerCase().startsWith('mso-'))
      .join('; ');
    if (filtered) {
      el.setAttribute('style', filtered);
    } else {
      el.removeAttribute('style');
    }
  });
}

function filterMsoClasses(doc) {
  doc.querySelectorAll('[class]').forEach(el => {
    const cls = el
      .getAttribute('class')
      .split(/\s+/)
      .filter(c => c && !/^Mso/i.test(c))
      .join(' ');
    if (cls) {
      el.setAttribute('class', cls);
    } else {
      el.removeAttribute('class');
    }
  });
}

function hoistListsOutOfStrike(doc) {
  doc.querySelectorAll('s, strike, del').forEach(el => {
    el.querySelectorAll('ul, ol').forEach(list => {
      el.parentNode.insertBefore(list, el.nextSibling);
    });
  });
}

function reparentNestedListsInLi(doc) {
  doc.querySelectorAll('ul, ol').forEach(list => {
    list.querySelectorAll(':scope > li').forEach(item => {
      Array.from(item.children)
        .filter(child => child.tagName === 'UL' || child.tagName === 'OL')
        .forEach(nestedList => item.appendChild(nestedList));
    });
  });
}

function stripImages(doc) {
  doc.querySelectorAll('img').forEach(el => el.remove());
}

const STRING_TRANSFORMS = [stripMsoConditionalComments, stripOfficeNamespacedTags];

const DOM_TRANSFORMS = [
  filterMsoStyleDeclarations,
  filterMsoClasses,
  hoistListsOutOfStrike,
  reparentNestedListsInLi,
  stripImages,
];

export function transformPastedHTML(html) {
  if (!html) return '';
  let cleaned = html;
  for (const transform of STRING_TRANSFORMS) {
    cleaned = transform(cleaned);
  }
  const doc = new DOMParser().parseFromString(cleaned, 'text/html');
  for (const transform of DOM_TRANSFORMS) {
    transform(doc);
  }
  return doc.body.innerHTML;
}
