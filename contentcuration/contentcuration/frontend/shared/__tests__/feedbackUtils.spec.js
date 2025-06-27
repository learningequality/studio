import { v4 as uuidv4 } from 'uuid';
import {
  sendRequest,
  FlagFeedbackEvent,
  RecommendationsEvent,
  RecommendationsInteractionEvent,
  FeedbackTypeOptions,
  FLAG_FEEDBACK_EVENT_ENDPOINT,
  RECOMMENDATION_EVENT_ENDPOINT,
  RECOMMENDATION_INTERACTION_EVENT_ENDPOINT,
} from '../feedbackApiUtils';
import client from '../client';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));
jest.mock('../client');

function setupRecommendationsEvent(method) {
  return new RecommendationsEvent({
    context: { model_version: 1, breadcrumbs: '#Title#->Random' },
    contentnode_id: uuidv4(),
    content_id: uuidv4(),
    target_channel_id: uuidv4(),
    user_id: uuidv4(),
    content: [
      {
        content_id: uuidv4(),
        node_id: uuidv4(),
        channel_id: uuidv4(),
        score: 4,
      },
    ],
    method: method,
  });
}

function setupRecommendationsInteractionEvent(method) {
  return new RecommendationsInteractionEvent({
    context: { test_key: 'test_value' },
    contentnode_id: uuidv4(),
    content_id: uuidv4(),
    feedback_type: FeedbackTypeOptions.ignored,
    feedback_reason: '----',
    recommendation_event_id: uuidv4(),
    method: method,
  });
}

describe('FeedBackUtility Tests', () => {
  let flagFeedbackEvent;
  let recommendationsEvent;
  let recommendationsInteractionEvent;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    flagFeedbackEvent = new FlagFeedbackEvent({
      context: { key: 'value' },
      contentnode_id: uuidv4(),
      content_id: uuidv4(),
      target_topic_id: uuidv4(),
      feedback_type: FeedbackTypeOptions.flagged,
      feedback_reason: 'Inappropriate Language',
    });

    recommendationsEvent = setupRecommendationsEvent('post');
    recommendationsInteractionEvent = setupRecommendationsInteractionEvent('post');

    // Reset all client method mocks
    client.post.mockRestore();
    client.put.mockRestore();
    client.patch.mockRestore();
    client.delete.mockRestore();
    client.get.mockRestore();
  });

  describe('FlagFeedbackEvent Tests', () => {
    it('should generate data object without functions', () => {
      const dataObject = flagFeedbackEvent.getDataObject();
      expect(dataObject.id).toEqual('mocked-uuid');
      expect(dataObject.context).toEqual({ key: 'value' });
      expect(dataObject.contentnode_id).toEqual('mocked-uuid');
      expect(dataObject.content_id).toEqual('mocked-uuid');
      expect(dataObject.getDataObject).toBeUndefined();
      expect(dataObject.target_topic_id).toEqual('mocked-uuid');
      expect(dataObject.feedback_type).toEqual(FeedbackTypeOptions.flagged);
      expect(dataObject.feedback_reason).toEqual('Inappropriate Language');
      expect(dataObject.endpoint).toBeUndefined();
    });

    it('should throw an error when endpoint is not defined', () => {
      flagFeedbackEvent.endpoint = undefined;
      expect(() => flagFeedbackEvent.getUrl()).toThrowError(
        'Resource is not defined for the FeedBack Object.',
      );
    });

    it('should return the correct URL when URL is defined', () => {
      const result = flagFeedbackEvent.getUrl();
      expect(result).toEqual(FLAG_FEEDBACK_EVENT_ENDPOINT);
    });

    it('should send a request using sendRequest function', async () => {
      client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));

      const result = await sendRequest(flagFeedbackEvent);

      expect(result).toEqual('Mocked API Response');
      expect(client.post).toHaveBeenCalledWith(
        flagFeedbackEvent.getUrl(),
        flagFeedbackEvent.getDataObject(),
      );
    });

    it.skip('should handle errors when sending a request using sendRequest function', async () => {
      client.post.mockRejectedValue(new Error('Mocked API Error'));
      await expect(sendRequest(flagFeedbackEvent)).rejects.toThrowError('Mocked API Error');
      expect(client.post).toHaveBeenCalledWith(
        flagFeedbackEvent.getUrl(),
        flagFeedbackEvent.getDataObject(),
      );
    });
  });

  describe('RecommendationsEvent Tests', () => {
    it('should generate data object without functions', () => {
      const dataObject = recommendationsEvent.getDataObject();
      expect(dataObject.id).toEqual('mocked-uuid');
      expect(dataObject.context).toEqual({ model_version: 1, breadcrumbs: '#Title#->Random' });
      expect(dataObject.contentnode_id).toEqual('mocked-uuid');
      expect(dataObject.content_id).toEqual('mocked-uuid');
      expect(dataObject.target_channel_id).toEqual('mocked-uuid');
      expect(dataObject.user_id).toEqual('mocked-uuid');
      expect(dataObject.content).toEqual([
        {
          content_id: 'mocked-uuid',
          node_id: 'mocked-uuid',
          channel_id: 'mocked-uuid',
          score: 4,
        },
      ]);
      expect(dataObject.getDataObject).toBeUndefined();
      expect(dataObject.endpoint).toBeUndefined();
    });

    it('should throw an error when endpoint is not defined', () => {
      recommendationsEvent.endpoint = undefined;
      expect(() => recommendationsEvent.getUrl()).toThrowError(
        'Resource is not defined for the FeedBack Object.',
      );
    });

    it('should return the correct URL when URL is defined', () => {
      const result = recommendationsEvent.getUrl();
      expect(result).toEqual(RECOMMENDATION_EVENT_ENDPOINT);
    });

    describe('HTTP Methods', () => {
      it('should send POST request successfully', async () => {
        client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsEvent = setupRecommendationsEvent('post');
        const result = await sendRequest(recommendationsEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.post).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getDataObject(),
        );
      });

      it('should send PUT request successfully', async () => {
        client.put.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsEvent = setupRecommendationsEvent('put');
        const result = await sendRequest(recommendationsEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.put).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getDataObject(),
        );
      });

      it('should send PATCH request successfully', async () => {
        client.patch.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsEvent = setupRecommendationsEvent('patch');
        const result = await sendRequest(recommendationsEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.patch).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getDataObject(),
        );
      });

      it('should handle errors for POST request', async () => {
        client.post.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsEvent = setupRecommendationsEvent('post');
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError('Mocked API Error');
        expect(client.post).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getDataObject(),
        );
      });

      it('should handle errors for PUT request', async () => {
        client.put.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsEvent = setupRecommendationsEvent('put');
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError('Mocked API Error');
        expect(client.put).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getDataObject(),
        );
      });

      it('should handle errors for PATCH request', async () => {
        client.patch.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsEvent = setupRecommendationsEvent('patch');
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError('Mocked API Error');
        expect(client.patch).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getDataObject(),
        );
      });

      it('should throw error for unsupported DELETE method', async () => {
        recommendationsEvent = setupRecommendationsEvent('delete');
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError(
          'Unsupported HTTP method: delete',
        );
      });

      it('should throw error for unsupported GET method', async () => {
        recommendationsEvent = setupRecommendationsEvent('get');
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError(
          'Unsupported HTTP method: get',
        );
      });
    });
  });

  describe('RecommendationsInteractionEvent Tests', () => {
    it('should generate data object without functions', () => {
      const dataObject = recommendationsInteractionEvent.getDataObject();
      expect(dataObject.id).toEqual('mocked-uuid');
      expect(dataObject.context).toEqual({ test_key: 'test_value' });
      expect(dataObject.contentnode_id).toEqual('mocked-uuid');
      expect(dataObject.content_id).toEqual('mocked-uuid');
      expect(dataObject.feedback_type).toEqual(FeedbackTypeOptions.ignored);
      expect(dataObject.feedback_reason).toEqual('----');
      expect(dataObject.recommendation_event_id).toEqual('mocked-uuid');
      expect(dataObject.getDataObject).toBeUndefined();
      expect(dataObject.endpoint).toBeUndefined();
    });

    it('should throw an error when endpoint is not defined', () => {
      recommendationsInteractionEvent.endpoint = undefined;
      expect(() => recommendationsInteractionEvent.getUrl()).toThrowError(
        'Resource is not defined for the FeedBack Object.',
      );
    });

    it('should return the correct URL when URL is defined', () => {
      const result = recommendationsInteractionEvent.getUrl();
      expect(result).toEqual(RECOMMENDATION_INTERACTION_EVENT_ENDPOINT);
    });

    describe('HTTP Methods', () => {
      it('should send POST request successfully', async () => {
        client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent('post');
        const result = await sendRequest(recommendationsInteractionEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.post).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should send PUT request successfully', async () => {
        client.put.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent('put');
        const result = await sendRequest(recommendationsInteractionEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.put).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should send PATCH request successfully', async () => {
        client.patch.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent('patch');
        const result = await sendRequest(recommendationsInteractionEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.patch).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should handle errors for POST request', async () => {
        client.post.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent('post');
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.post).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should handle errors for PUT request', async () => {
        client.put.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent('put');
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.put).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should handle errors for PATCH request', async () => {
        client.patch.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent('patch');
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.patch).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should throw error for unsupported DELETE method', async () => {
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent('delete');
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Unsupported HTTP method: delete',
        );
      });

      it('should throw error for unsupported GET method', async () => {
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent('get');
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Unsupported HTTP method: get',
        );
      });
    });
  });
});
