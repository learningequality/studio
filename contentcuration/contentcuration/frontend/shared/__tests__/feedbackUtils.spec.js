import { v4 as uuidv4 } from 'uuid';
import {
  sendRequest,
  FlagFeedbackEvent,
  RecommendationsEvent,
  RecommendationsInteractionEvent,
  FeedbackTypeOptions,
} from '../feedbackApiUtils';
import client from '../client';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));
jest.mock('../client');

function setupRecommendationsEvent({ method, id }) {
  return new RecommendationsEvent({
    method: method,
    data: {
      id: id,
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
    },
  });
}

function setupRecommendationsInteractionEvent({
  method,
  bulk = false,
  dataOverride = null,
  override = false,
  id = null,
}) {
  const data = {
    id: id,
    context: { test_key: 'test_value' },
    contentnode_id: uuidv4(),
    content_id: uuidv4(),
    feedback_type: FeedbackTypeOptions.ignored,
    feedback_reason: '----',
    recommendation_event_id: uuidv4(),
  };
  return new RecommendationsInteractionEvent({
    method: method,
    data: override ? dataOverride : bulk ? [data] : data,
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
      data: {
        context: { key: 'value' },
        contentnode_id: uuidv4(),
        content_id: uuidv4(),
        target_topic_id: uuidv4(),
        feedback_type: FeedbackTypeOptions.flagged,
        feedback_reason: 'Inappropriate Language',
      },
    });

    recommendationsEvent = setupRecommendationsEvent({
      method: 'post',
    });
    recommendationsInteractionEvent = setupRecommendationsInteractionEvent({ method: 'post' });

    // Reset all client method mocks
    client.post.mockRestore();
    client.put.mockRestore();
    client.patch.mockRestore();
    client.delete.mockRestore();
    client.get.mockRestore();
  });

  describe('FlagFeedbackEvent Tests', () => {
    it('should generate data object without functions', () => {
      const eventId = flagFeedbackEvent.getEventId();
      const dataObject = flagFeedbackEvent.getData();
      expect(dataObject.id).toEqual('mocked-uuid');
      expect(eventId).toEqual(dataObject.id);
      expect(dataObject.context).toEqual({ key: 'value' });
      expect(dataObject.contentnode_id).toEqual('mocked-uuid');
      expect(dataObject.content_id).toEqual('mocked-uuid');
      expect(dataObject.data).toBeUndefined();
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

    it('should return the correct url when endpoint is defined', () => {
      const testUrl = 'http://example.com/api/flagged';
      jest.spyOn(flagFeedbackEvent, 'getUrl').mockReturnValue(testUrl);
      const result = flagFeedbackEvent.getUrl();
      expect(result).toEqual(testUrl);
    });

    it('should send a request using sendRequest function', async () => {
      client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));

      const result = await sendRequest(flagFeedbackEvent);

      expect(result).toEqual('Mocked API Response');
      expect(client.post).toHaveBeenCalledWith(
        flagFeedbackEvent.getUrl(),
        flagFeedbackEvent.getData(),
      );
    });

    it.skip('should handle errors when sending a request using sendRequest function', async () => {
      client.post.mockRejectedValue(new Error('Mocked API Error'));
      await expect(sendRequest(flagFeedbackEvent)).rejects.toThrowError('Mocked API Error');
      expect(client.post).toHaveBeenCalledWith(
        flagFeedbackEvent.getUrl(),
        flagFeedbackEvent.getData(),
      );
    });
  });

  describe('RecommendationsEvent Tests', () => {
    it('should generate data object without functions', () => {
      const eventId = recommendationsEvent.getEventId();
      const dataObject = recommendationsEvent.getData();
      expect(dataObject.id).toEqual('mocked-uuid');
      expect(eventId).toEqual(dataObject.id);
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
      expect(dataObject.data).toBeUndefined();
      expect(dataObject.endpoint).toBeUndefined();
    });

    it('should throw an error when endpoint is not defined', () => {
      recommendationsEvent.endpoint = undefined;
      expect(() => recommendationsEvent.getUrl()).toThrowError(
        'Resource is not defined for the FeedBack Object.',
      );
    });

    it('should return the correct url when endpoint is defined', () => {
      const testUrl = 'http://example.com/api/recommendations';
      jest.spyOn(recommendationsEvent, 'getUrl').mockReturnValue(testUrl);
      const result = recommendationsEvent.getUrl();
      expect(result).toEqual(result);
    });

    describe('HTTP Methods', () => {
      it('should send POST request successfully', async () => {
        client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsEvent = setupRecommendationsEvent({
          method: 'post',
        });
        const result = await sendRequest(recommendationsEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.post).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getData(),
        );
      });

      it('should send PUT request successfully', async () => {
        client.put.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsEvent = setupRecommendationsEvent({
          method: 'put',
          id: uuidv4(),
        });
        const result = await sendRequest(recommendationsEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.put).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getData(),
        );
      });

      it('should send PATCH request successfully', async () => {
        client.patch.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsEvent = setupRecommendationsEvent({
          method: 'patch',
          id: uuidv4(),
        });
        const result = await sendRequest(recommendationsEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.patch).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getData(),
        );
      });

      it('should handle errors for POST request', async () => {
        client.post.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsEvent = setupRecommendationsEvent({
          method: 'post',
        });
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError('Mocked API Error');
        expect(client.post).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getData(),
        );
      });

      it('should handle errors for PUT request', async () => {
        client.put.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsEvent = setupRecommendationsEvent({
          method: 'put',
          id: uuidv4(),
        });
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError('Mocked API Error');
        expect(client.put).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getData(),
        );
      });

      it('should handle errors for PATCH request', async () => {
        client.patch.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsEvent = setupRecommendationsEvent({
          method: 'patch',
          id: uuidv4(),
        });
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError('Mocked API Error');
        expect(client.patch).toHaveBeenCalledWith(
          recommendationsEvent.getUrl(),
          recommendationsEvent.getData(),
        );
      });

      it('should throw error for unsupported DELETE method', async () => {
        recommendationsEvent = setupRecommendationsEvent({
          method: 'delete',
          id: uuidv4(),
        });
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError(
          'Unsupported HTTP method: delete',
        );
      });

      it('should throw error for unsupported GET method', async () => {
        recommendationsEvent = setupRecommendationsEvent({
          method: 'get',
          id: uuidv4(),
        });
        await expect(sendRequest(recommendationsEvent)).rejects.toThrowError(
          'Unsupported HTTP method: get',
        );
      });
    });
  });

  describe('RecommendationsInteractionEvent Tests', () => {
    it('should generate data object without functions', () => {
      const eventId = recommendationsInteractionEvent.getEventId();
      const dataObject = recommendationsInteractionEvent.getData();
      expect(dataObject.id).toEqual('mocked-uuid');
      expect(eventId).toEqual(dataObject.id);
      expect(dataObject.context).toEqual({ test_key: 'test_value' });
      expect(dataObject.contentnode_id).toEqual('mocked-uuid');
      expect(dataObject.content_id).toEqual('mocked-uuid');
      expect(dataObject.feedback_type).toEqual(FeedbackTypeOptions.ignored);
      expect(dataObject.feedback_reason).toEqual('----');
      expect(dataObject.recommendation_event_id).toEqual('mocked-uuid');
      expect(dataObject.data).toBeUndefined();
      expect(dataObject.endpoint).toBeUndefined();
    });

    it('should throw an error when data is not defined', () => {
      expect(() =>
        setupRecommendationsInteractionEvent({
          method: 'post',
          bulk: true,
          dataOverride: null,
          override: true,
        }),
      ).toThrowError('The data property cannot be null or undefined');
    });

    it('should throw an error when data is an array but method is not a POST', () => {
      expect(() =>
        setupRecommendationsInteractionEvent({
          method: 'put',
          bulk: true,
          dataOverride: [],
          override: true,
        }),
      ).toThrowError("Array 'data' is only allowed for 'post' requests");
    });

    it('should throw an error when data is an empty array and method is a POST', () => {
      expect(() =>
        setupRecommendationsInteractionEvent({
          method: 'post',
          bulk: true,
          dataOverride: [],
          override: true,
        }),
      ).toThrowError("The 'data' array cannot be empty");
    });

    it('should throw an error when data is any of any type other than array or object', () => {
      expect(() =>
        setupRecommendationsInteractionEvent({
          method: 'post',
          bulk: true,
          dataOverride: 'invalid data type',
          override: true,
        }),
      ).toThrowError("The 'data' must be either a non-null object or an array of objects");
    });

    it('should throw an error when submitted data has missing fields', () => {
      expect(() =>
        setupRecommendationsInteractionEvent({
          method: 'post',
          bulk: false,
          dataOverride: {},
          override: true,
        }),
      ).toThrowError(/The 'data' object is missing required property: \w+/);
    });

    it('should throw an error when submitted data array has invalid data', () => {
      expect(() =>
        setupRecommendationsInteractionEvent({
          method: 'post',
          bulk: false,
          dataOverride: [null],
          override: true,
        }),
      ).toThrowError(/Item at position \w+ in 'data' is not a valid object/);
    });

    it('should throw an error when submitted data array has valid data but with missing fields', () => {
      expect(() =>
        setupRecommendationsInteractionEvent({
          method: 'post',
          bulk: false,
          dataOverride: [{}],
          override: true,
        }),
      ).toThrowError(/Missing required property in 'data': \w+ at position: \w+/);
    });

    it('should throw an error when endpoint is not defined', () => {
      recommendationsInteractionEvent.endpoint = undefined;
      expect(() => recommendationsInteractionEvent.getUrl()).toThrowError(
        'Resource is not defined for the FeedBack Object.',
      );
    });

    it('should return a url when the endpoint is defined', () => {
      const testUrl = 'http://example.com/api/recommendations_interaction';
      jest.spyOn(recommendationsInteractionEvent, 'getUrl').mockReturnValue(testUrl);
      const result = recommendationsInteractionEvent.getUrl();
      expect(result).toEqual(testUrl);
    });

    describe('HTTP Methods', () => {
      it('should send POST request successfully', async () => {
        client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'post',
        });
        const result = await sendRequest(recommendationsInteractionEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.post).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getData(),
        );
      });

      it('should send Bulk POST request successfully', async () => {
        client.post.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'post',
          bulk: true,
        });
        const result = await sendRequest(recommendationsInteractionEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.post).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getData(),
        );
      });

      it('should send PUT request successfully', async () => {
        client.put.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'put',
        });
        const result = await sendRequest(recommendationsInteractionEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.put).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getData(),
        );
      });

      it('should send PATCH request successfully', async () => {
        client.patch.mockResolvedValue(Promise.resolve({ data: 'Mocked API Response' }));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'patch',
        });
        const result = await sendRequest(recommendationsInteractionEvent);
        expect(result).toEqual('Mocked API Response');
        expect(client.patch).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getData(),
        );
      });

      it('should handle errors for POST request', async () => {
        client.post.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'post',
        });
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.post).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getData(),
        );
      });

      it('should handle errors for PUT request', async () => {
        client.put.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'put',
        });
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.put).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getData(),
        );
      });

      it('should handle errors for PATCH request', async () => {
        client.patch.mockRejectedValue(new Error('Mocked API Error'));
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'patch',
        });
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Mocked API Error',
        );
        expect(client.patch).toHaveBeenCalledWith(
          recommendationsInteractionEvent.getUrl(),
          recommendationsInteractionEvent.getData(),
        );
      });

      it('should throw error for unsupported DELETE method', async () => {
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'delete',
        });
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Unsupported HTTP method: delete',
        );
      });

      it('should throw error for unsupported GET method', async () => {
        recommendationsInteractionEvent = setupRecommendationsInteractionEvent({
          method: 'get',
          id: uuidv4(),
        });
        await expect(sendRequest(recommendationsInteractionEvent)).rejects.toThrowError(
          'Unsupported HTTP method: get',
        );
      });
    });
  });
});
