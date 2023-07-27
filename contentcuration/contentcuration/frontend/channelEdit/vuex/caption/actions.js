import { CaptionFile, CaptionCues } from 'shared/data/resources';

export async function loadCaptionFiles(commit, params) {
    const captionFiles = await CaptionFile.where(params); 
    commit('ADD_CAPTIONFILES', { captionFiles, nodeIds: params.contentnode_id });
    return captionFiles;
}

export async function loadCaptionCues({ commit }, { caption_file_id }) {
    const cues = await CaptionCues.where({ caption_file_id })
    commit('ADD_CAPTIONCUES', cues);
    return cues;
}

export async function loadCaptions({ commit, rootGetters }, params) {
    const isAIFeatureEnabled = rootGetters['currentChannel/isAIFeatureEnabled'];
    if(!isAIFeatureEnabled) return;

    // If a new file is uploaded, the contentnode_id will be string
    if(typeof params.contentnode_id === 'string') {
        params.contentnode_id = [params.contentnode_id]
    }
    const nodeIdsToLoad = [];
    for (const nodeId of params.contentnode_id) {
        const node = rootGetters['contentNode/getContentNode'](nodeId);
        if (node && (node.kind === 'video' || node.kind === 'audio')) {
            nodeIdsToLoad.push(nodeId); // already in vuex
        } else if(!node) {
            nodeIdsToLoad.push(nodeId); // Assume that its audio/video
        }
    }

    const captionFiles = await loadCaptionFiles(commit, {
        contentnode_id: nodeIdsToLoad
    });

    // If there is no Caption File for this contentnode
    // Don't request for the cues
    if(captionFiles.length === 0) return;
    // TODO: call loadCaptionCues -> to be done after I finish saving captionFiles in indexedDB When CTA is called. So I have captions saved in the backend.
}


export async function addCaptionFile({ commit }, { file_id, language, nodeId }) {
    const captionFile = {
        file_id: file_id,
        language: language
    }
    return CaptionFile.put(captionFile).then(id => {
        captionFile.id = id;
        console.log(captionFile, nodeId);
        commit('ADD_CAPTIONFILE', { 
            captionFile, 
            nodeId 
        });
    })
}