import { CaptionFile, CaptionCues } from 'shared/data/resources';

export async function loadCaptionFiles(commit, params) {
    const captionFiles = await CaptionFile.where(params);
    commit('ADD_CAPTIONFILES', { captionFiles, nodeId: params.contentnode_id});
    return captionFiles;
}

export async function loadCaptionCues({ commit }, { caption_file_id }) {
    const cues = await CaptionCues.where({ caption_file_id })
    commit('ADD_CAPTIONCUES', cues);
    return cues;
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