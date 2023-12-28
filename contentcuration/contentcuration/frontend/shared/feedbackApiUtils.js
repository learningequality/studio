// Helper functions and Utils for creating an API request to
// Feedback mechanism endpoints
import { v4 as uuidv4 } from 'uuid';
import client from './client';

export const FeedbackTypeOptions = {
  imported: 'imported',
  rejected: 'rejected',
  previewd: 'previewd',
  showmore: 'showmore',
  ignored: 'ignored',
  flagged: 'flagged',
};

// This is mock currently, fixed value of URL still to be decided
export const FLAG_FEEDBACK_EVENT_URL = '/api/flagged/';

/**
 * Base class for feedback data objects.
 */
class BaseFeedback {
  /**
   * Initializes a new BaseFeedback object.
   *
   * @class
   * @classdesc Represents a base feedback object with common properties and methods.
   *
   * @param {Object} object - Object passed down following the .
   * @param {Object} [object.context={}] - The context associated with the ObjectType.
   * @param {string} object.contentnode_id - Id for ContentNode that does not change.
   * @param {string} object.content_id - content_id of ContentNode wrt to ObjectType.
   */
  constructor({ context = {}, contentnode_id, content_id }) {
    this.id = uuidv4();
    this.context = context;
    this.contentnode_id = contentnode_id;
    this.content_id = content_id;
  }

  // Creates a data object according to Backends expectation,
  // excluding functions and the "URL" property.
  getDataObject() {
    const dataObject = {};
    for (const key in this) {
      if (
        Object.prototype.hasOwnProperty.call(this, key) &&
        typeof this[key] !== 'function' &&
        key !== 'URL'
      ) {
        dataObject[key] = this[key];
      }
    }
    return dataObject;
  }

  // Return URL associated with the ObjectType
  getUrl() {
    if (this.defaultURL === null || this.URL === undefined) {
      throw new Error('URL is not defined for the FeedBack Object.');
    }
    return this.URL;
  }
}

/**
 * Initializes a new BaseFeedbackEvent object.
 *
 * @param {Object} params - Parameters for initializing the object.
 * @param {Object} params.user - The user associated with the feedback event.
 * @param {string} params.target_channel_id - The ID of the target channel for the feedback event.
 * @param {Object} baseFeedbackParams - Additional parameters inherited from the base feedbackclass.
 */
// eslint-disable-next-line no-unused-vars
class BaseFeedbackEvent extends BaseFeedback {
  constructor({ user, target_channel_id, ...baseFeedbackParams }) {
    super(baseFeedbackParams);
    this.user = user;
    this.target_channel_id = target_channel_id;
  }
}

/**
 * Initializes a new BaseFeedbackInteractionEvent object.
 * @param {Object} params - Parameters for initializing the interaction event.
 * @param {string} params.feedback_type - The type of feedback for the interaction event.
 * @param {string} params.feedback_reason - The reason associated with the feedback.
 * @param {Object} baseFeedbackParams - Additional parameters inherited from the base feedbackclass.
 */
class BaseFeedbackInteractionEvent extends BaseFeedback {
  constructor({ feedback_type, feedback_reason, ...baseFeedbackParams }) {
    super(baseFeedbackParams);
    this.feedback_type = feedback_type;
    this.feedback_reason = feedback_reason;
  }
}

/**
 * Initializes a new BaseFlagFeedback object.
 *
 * @param {Object} params - Parameters for initializing the flag feedback.
 * @param {string} params.target_topic_id - The ID of the target topic associated with
 * the flag feedback.
 * @param {Object} baseFeedbackParams - Additional parameters inherited from the
 * base interaction event class.
 */
class BaseFlagFeedback extends BaseFeedbackInteractionEvent {
  constructor({ target_topic_id, ...baseFeedbackParams }) {
    super({ ...baseFeedbackParams });
    this.target_topic_id = target_topic_id;
  }
}

/**
 * Initializes a new FlagFeedbackEvent object.
 *
 *
 * @param {Object} params - Parameters for initializing the flag feedback event.
 * @param {string} params.target_topic_id - Id of the topic where the flagged content is located.
 * @param {Object} baseFeedbackParams - Additional parameters inherited from the
 * base flag feedback class.
 */
export class FlagFeedbackEvent extends BaseFlagFeedback {
  constructor({ target_topic_id, ...baseFeedbackParams }) {
    super({ target_topic_id, ...baseFeedbackParams });
    this.URL = FLAG_FEEDBACK_EVENT_URL;
  }
}

/**
 * Sends a request using the provided feedback object.
 *
 * @function
 *
 * @param {BaseFeedback} feedbackObject - The feedback object to use for the request.
 * @throws {Error} Throws an error if the URL is not defined for the feedback object.
 * @returns {Promise<Object>} A promise that resolves to the response data from the API.
 */
export async function sendRequest(feedbackObject) {
  try {
    const url = feedbackObject.getUrl();
    const response = await client.post(url, feedbackObject.getDataObject());
    console.log('API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
