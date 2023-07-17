import { CaptionFile, CaptionCues } from 'shared/data/resources';

export async function loadCaptionFiles({ commit }, params) {
    const captionFiles = await CaptionFile.where(params);
    commit('ADD_CAPTIONFILES', captionFiles);
    return captionFiles;
}

export async function loadCaptionCues({ commit }, { caption_file_id }) {
    const cues = await CaptionCues.where({ caption_file_id })
    commit('ADD_CAPTIONCUES', cues);
    return cues;
}
