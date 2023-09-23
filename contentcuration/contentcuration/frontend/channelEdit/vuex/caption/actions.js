import { CaptionFile, CaptionCues } from 'shared/data/resources';
import { GENERATING } from 'shared/data/constants';

export async function loadCaptionFiles(commit, params) {
  const captionFiles = await CaptionFile.where(params);
  commit('ADD_CAPTIONFILES', { captionFiles, nodeIds: params.contentnode__in });
  return captionFiles;
}

export async function loadCaptionCues(commit, { caption_file_id }) {
  const cues = await CaptionCues.where({ caption_file_id });
  commit('ADD_CAPTIONCUES', cues);
  return cues;
}

export async function loadCaptions({ commit, rootGetters }, params) {
  const isAIFeatureEnabled = rootGetters['currentChannel/isAIFeatureEnabled'];
  if (!isAIFeatureEnabled) return;

  // If a new file is uploaded, the contentnode_id will be string
  if (typeof params.contentnode__in === 'string') {
    params.contentnode__in = [params.contentnode__in];
  }
  const nodeIdsToLoad = [];
  for (const nodeId of params.contentnode__in) {
    const node = rootGetters['contentNode/getContentNode'](nodeId);
    if (node && (node.kind === 'video' || node.kind === 'audio')) {
      nodeIdsToLoad.push(nodeId); // already in vuex
    } else if (!node) {
      nodeIdsToLoad.push(nodeId); // Assume that its audio/video
    }
  }

  const captionFiles = await loadCaptionFiles(commit, {
    contentnode__in: nodeIdsToLoad,
  });

  // If there is no Caption File for this contentnode don't request for the cues
  if (captionFiles.length === 0) return;

  captionFiles.forEach(file => {
    // Load all the cues associated with the file_id
    const caption_file_id = file.id;
    loadCaptionCues(commit, {
      caption_file_id,
    });
  });
}

export async function addCaptionFile({ state, commit }, { id, file_id, language, nodeId }) {
  const captionFile = {
    id: id,
    file_id: file_id,
    language: language,
  };
  // The file_id and language should be unique together in the vuex state. 
  // This check avoids duplicating existing caption data already loaded into vuex.
  const alreadyExists = state.captionFilesMap[nodeId]
    ? Object.values(state.captionFilesMap[nodeId]).find(
        file => file.language === captionFile.language && file.file_id === captionFile.file_id
      )
    : null;

  if (!alreadyExists) {
    // new created file will enqueue generate caption celery task
    captionFile[GENERATING] = true;
    return CaptionFile.add(captionFile).then(id => {
      commit('ADD_CAPTIONFILE', {
        id,
        captionFile,
        nodeId,
      });
    });
  }
}

export async function loadCaptions({ commit, rootGetters }, params) {
    const AI_FEATURE_FLAG = rootGetters['currentChannel/isAIFeatureEnabled']
    if(!AI_FEATURE_FLAG) return;

    const FILE_TYPE = rootGetters['contentNode/getContentNode'](params.contentnode_id).kind;
    if(FILE_TYPE === 'video' || FILE_TYPE === 'audio') {
        const captionFiles = await loadCaptionFiles(commit, params);
        // If there is no Caption File for this contentnode
        // Don't request for the cues
        if(captionFiles.length === 0) return;
        // TODO: call loadCaptionCues -> to be done after I finish saving captionFiles in indexedDB When CTA is called. So I have captions saved in the backend.
    }
}

export async function addCaptionFile({ commit }, { captionFile, nodeId }) {
    commit('ADD_CAPTIONFILE', { captionFile, nodeId });
}