
export async function addCaptionFile({ commit }, { file_id, language, nodeId }) {
    const captionFile = {
        file_id: file_id,
        language: language
    }
    return CaptionFile.add(captionFile).then(id => {
        captionFile.id = id;
        console.log(captionFile, nodeId);
        commit('ADD_CAPTIONFILE', { 
            captionFile, 
            nodeId 
        });
    })
}
