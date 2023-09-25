import { GENERATING } from 'shared/data/constants';

export function isGeneratingGetter(state, _getters, _rootState, _rootGetters) {
    return (contentnode_id) => {
        const captionFileIds = Object.keys(state.captionFilesMap[contentnode_id] || {});
        let isAnyGenerating = false;
        for (const id of captionFileIds) {
            if (state.captionFilesMap[contentnode_id][id][GENERATING] === true) {
                isAnyGenerating = true;
                break; // Exit loop if a generating flag is found
            }
        }
        return isAnyGenerating;
    }
}
