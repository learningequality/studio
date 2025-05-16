import { v4 as uuidv4 } from 'uuid';
import {
  sendRequest,
  FlagFeedbackEvent,
  RecommendationsEvent,
  RecommendationsInteractionEvent,
  FeedbackTypeOptions,
  FLAG_FEEDBACK_EVENT_URL,
  RECCOMMENDATION_EVENT_URL,
  RECCOMMENDATION_INTERACTION_EVENT_URL,
} from '../feedbackApiUtils';
import client from '../client';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));
jest.mock('../client');

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

    recommendationsEvent = new RecommendationsEvent({
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
    });

    recommendationsInteractionEvent = new RecommendationsInteractionEvent({
      context: { test_key: 'test_value' },
      contentnode_id: uuidv4(),
      content_id: uuidv4(),
      feedback_type: FeedbackTypeOptions.ignored,
      feedback_reason: '----',
      recommendation_event_id: uuidv4(), //currently this is random to test but should have the actual
      // recommendation event id of the recommendation event
    });

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
      expect(dataObject.URL).toBeUndefined();
    });

    it('should throw an error when URL is not defined', () => {
      flagFeedbackEvent.URL = undefined;
      expect(() => flagFeedbackEvent.getUrl()).toThrowError(
        'URL is not defined for the FeedBack Object.',
      );
    });

    it('should return the correct URL when URL is defined', () => {
      const result = flagFeedbackEvent.getUrl();
      expect(result).toEqual(FLAG_FEEDBACK_EVENT_URL);
    });

    it('should send a request using sendRequest function', async () => {
      client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));

      const result = await sendRequest(flagFeedbackEvent);

      expect(result).toEqual('Mocked API Response');
      expect(client.post).toHaveBeenCalledWith(
        FLAG_FEEDBACK_EVENT_URL,
        flagFeedbackEvent.getDataObject(),
      );
    });

    it.skip('should handle errors when sending a request using sendRequest function', async () => {
      client.post.mockRejectedValue(new Error('Mocked API Error'));
      await expect(sendRequest(flagFeedbackEvent)).rejects.toThrowError('Mocked API Error');
      expect(client.post).toHaveBeenCalledWith(
        FLAG_FEEDBACK_EVENT_URL,
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
      expect(dataObject.URL).toBeUndefined();
    });

    it('should throw an error when URL is not defined', () => {
      recommendationsEvent.URL = undefined;
      expect(() => recommendationsEvent.getUrl()).toThrowError(
        'URL is not defined for the FeedBack Object.',
      );
    });

    it('should return the correct URL when URL is defined', () => {
      const result = recommendationsEvent.getUrl();
      expect(result).toEqual(RECCOMMENDATION_EVENT_URL);
    });

    describe('HTTP Methods', () => {
      it('should send POST request successfully', async () => {
        client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        const result = await sendRequest(recommendationsEvent, 'post');
        expect(result).toEqual('Mocked API Response');
        expect(client.post).toHaveBeenCalledWith(
          RECCOMMENDATION_EVENT_URL,
          recommendationsEvent.getDataObject(),
        );
      });

      it('should send PUT request successfully', async () => {
        client.put.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        const result = await sendRequest(recommendationsEvent, 'put');
        expect(result).toEqual('Mocked API Response');
        expect(client.put).toHaveBeenCalledWith(
          RECCOMMENDATION_EVENT_URL,
          recommendationsEvent.getDataObject(),
        );
      });

      it('should send PATCH request successfully', async () => {
        client.patch.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        const result = await sendRequest(recommendationsEvent, 'patch');
        expect(result).toEqual('Mocked API Response');
        expect(client.patch).toHaveBeenCalledWith(
          RECCOMMENDATION_EVENT_URL,
          recommendationsEvent.getDataObject(),
        );
      });

      it('should handle errors for POST request', async () => {
        client.post.mockRejectedValue(new Error('Mocked API Error'));
        await expect(sendRequest(recommendationsEvent, 'post')).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.post).toHaveBeenCalledWith(
          RECCOMMENDATION_EVENT_URL,
          recommendationsEvent.getDataObject(),
        );
      });

      it('should handle errors for PUT request', async () => {
        client.put.mockRejectedValue(new Error('Mocked API Error'));
        await expect(sendRequest(recommendationsEvent, 'put')).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.put).toHaveBeenCalledWith(
          RECCOMMENDATION_EVENT_URL,
          recommendationsEvent.getDataObject(),
        );
      });

      it('should handle errors for PATCH request', async () => {
        client.patch.mockRejectedValue(new Error('Mocked API Error'));
        await expect(sendRequest(recommendationsEvent, 'patch')).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.patch).toHaveBeenCalledWith(
          RECCOMMENDATION_EVENT_URL,
          recommendationsEvent.getDataObject(),
        );
      });

      it('should throw error for unsupported DELETE method', async () => {
        await expect(sendRequest(recommendationsEvent, 'delete')).rejects.toThrowError(
          'Unsupported HTTP method: delete',
        );
      });

      it('should throw error for unsupported GET method', async () => {
        await expect(sendRequest(recommendationsEvent, 'get')).rejects.toThrowError(
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
      expect(dataObject.URL).toBeUndefined();
    });

    it('should throw an error when URL is not defined', () => {
      recommendationsInteractionEvent.URL = undefined;
      expect(() => recommendationsInteractionEvent.getUrl()).toThrowError(
        'URL is not defined for the FeedBack Object.',
      );
    });

    it('should return the correct URL when URL is defined', () => {
      const result = recommendationsInteractionEvent.getUrl();
      expect(result).toEqual(RECCOMMENDATION_INTERACTION_EVENT_URL);
    });

    describe('HTTP Methods', () => {
      it('should send POST request successfully', async () => {
        client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        const result = await sendRequest(recommendationsInteractionEvent, 'post');
        expect(result).toEqual('Mocked API Response');
        expect(client.post).toHaveBeenCalledWith(
          RECCOMMENDATION_INTERACTION_EVENT_URL,
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should send PUT request successfully', async () => {
        client.put.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        const result = await sendRequest(recommendationsInteractionEvent, 'put');
        expect(result).toEqual('Mocked API Response');
        expect(client.put).toHaveBeenCalledWith(
          RECCOMMENDATION_INTERACTION_EVENT_URL,
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should send PATCH request successfully', async () => {
        client.patch.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        const result = await sendRequest(recommendationsInteractionEvent, 'patch');
        expect(result).toEqual('Mocked API Response');
        expect(client.patch).toHaveBeenCalledWith(
          RECCOMMENDATION_INTERACTION_EVENT_URL,
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should handle errors for POST request', async () => {
        client.post.mockRejectedValue(new Error('Mocked API Error'));
        await expect(sendRequest(recommendationsInteractionEvent, 'post')).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.post).toHaveBeenCalledWith(
          RECCOMMENDATION_INTERACTION_EVENT_URL,
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should handle errors for PUT request', async () => {
        client.put.mockRejectedValue(new Error('Mocked API Error'));
        await expect(sendRequest(recommendationsInteractionEvent, 'put')).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.put).toHaveBeenCalledWith(
          RECCOMMENDATION_INTERACTION_EVENT_URL,
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should handle errors for PATCH request', async () => {
        client.patch.mockRejectedValue(new Error('Mocked API Error'));
        await expect(sendRequest(recommendationsInteractionEvent, 'patch')).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.patch).toHaveBeenCalledWith(
          RECCOMMENDATION_INTERACTION_EVENT_URL,
          recommendationsInteractionEvent.getDataObject(),
        );
      });

      it('should throw error for unsupported DELETE method', async () => {
        await expect(sendRequest(recommendationsInteractionEvent, 'delete')).rejects.toThrowError(
          'Unsupported HTTP method: delete',
        );
      });

      it('should throw error for unsupported GET method', async () => {
        await expect(sendRequest(recommendationsInteractionEvent, 'get')).rejects.toThrowError(
          'Unsupported HTTP method: get',
        );
      });
    });
  });
});
