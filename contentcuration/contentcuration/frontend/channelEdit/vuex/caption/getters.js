import { GENERATING } from 'shared/data/constants';

export function isGeneratingGetter(state) {
  return contentnode_id => {
    const captionFiles = Object.values(state.captionFilesMap[contentnode_id] || {});
    return captionFiles.some(file => file[GENERATING] === true);
  };
}
