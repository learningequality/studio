import { v4 as uuidv4 } from 'uuid';
import {
  sendRequest,
  FlagFeedbackEvent,
  FeedbackTypeOptions,
  FLAG_FEEDBACK_EVENT_URL,
} from '../feedbackApiUtils';
import client from '../client';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));
jest.mock('../client');

describe('FeedBackUtility Tests', () => {
  let flagFeedbackEvent;

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
    client.post.mockRestore();
  });

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
