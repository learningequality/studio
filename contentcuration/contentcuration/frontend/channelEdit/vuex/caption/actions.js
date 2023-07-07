import { CaptionFile } from 'shared/data/resources';

export async function loadCaptionFiles(context, params) {
  try {
    const captionFiles = await CaptionFile.where();
    context.commit('ADD_CAPTIONFILES', captionFiles);
    return captionFiles;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
