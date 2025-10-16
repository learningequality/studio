import { useFetch } from '../../../../composables/useFetch';
import { Channel } from 'shared/data/resources';

export function usePublishedData(channelId) {
  return useFetch({ asyncFetchFunc: () => Channel.getPublishedData(channelId) });
}
