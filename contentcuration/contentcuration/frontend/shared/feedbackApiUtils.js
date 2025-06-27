// Helper functions and Utils for creating an API request to
// Feedback mechanism endpoints
import { v4 as uuidv4 } from 'uuid';
import client from './client';
import urls from 'shared/urls';

export const FeedbackTypeOptions = {
  imported: 'IMPORTED',
  rejected: 'REJECTED',
  previewed: 'PREVIEWED',
  showmore: 'SHOWMORE',
  ignored: 'IGNORED',
  flagged: 'FLAGGED',
};

export const FLAG_FEEDBACK_EVENT_ENDPOINT = 'flagged';
export const RECOMMENDATION_EVENT_ENDPOINT = 'recommendations';
export const RECOMMENDATION_INTERACTION_EVENT_ENDPOINT = 'recommendations-interaction';

/**
 * @typedef {Object} BaseFeedbackParams
 * @property {Object} context - The context associated with the ObjectType.
 * @property {string} contentnode_id - Id for ContentNode that does not change.
 * @property {string} content_id - content_id of ContentNode wrt to ObjectType.
 */

/**
 * Base class for feedback data objects.
 */
class BaseFeedback {
  /**
   * Initializes a new BaseFeedback object.
   *
   * @class
   * @classdesc Represents a base feedback object with common properties and methods.
   * @param {BaseFeedbackParams} object
   */
  constructor({ id, context = {}, contentnode_id, content_id, method }) {
    this.id = id || uuidv4();
    this.context = context;
    this.contentnode_id = contentnode_id;
    this.content_id = content_id;
    this.method = method || 'post';
  }

  // Creates a data object according to Backends expectation,
  // excluding functions and the "endpoint" property.
  getDataObject() {
    const dataObject = {};
    for (const key in this) {
      if (
        Object.prototype.hasOwnProperty.call(this, key) &&
        typeof this[key] !== 'function' &&
        key !== 'endpoint' &&
        key !== 'method'
      ) {
        dataObject[key] = this[key];
      }
    }
    return dataObject;
  }

  // Return the url associated with the ObjectType
  getUrl() {
    if (!this.endpoint) {
      throw new Error('Resource is not defined for the FeedBack Object.');
    }

    let url;
    if (['patch', 'put'].includes(this.getMethod())) {
      url = urls[`${this.endpoint}-detail`](this.id);
    } else {
      url = urls[`${this.endpoint}-list`]();
    }
    return url;
  }

  getMethod() {
    return this.method.toLowerCase();
  }
}

/**
 * Initializes a new BaseFeedbackEvent object.
 *
 * @param {Object} params - Parameters for initializing the object.
 * @param {string} params.user_id - The user_id associated with the feedback event.
 * @param {string} params.target_channel_id - The ID of the target channel for the feedback event.
 * @param {BaseFeedbackParams} baseFeedbackParams - Additional parameters inherited
 * from the base feedbackclass.
 */
// eslint-disable-next-line no-unused-vars
class BaseFeedbackEvent extends BaseFeedback {
  constructor({ user_id, target_channel_id, ...baseFeedbackParams }) {
    super(baseFeedbackParams);
    this.user_id = user_id;
    this.target_channel_id = target_channel_id;
  }
}

/**
 * Initializes a new BaseFeedbackInteractionEvent object.
 * @param {Object} params - Parameters for initializing the interaction event.
 * @param {string} params.feedback_type - The type of feedback for the interaction event.
 * @param {string} params.feedback_reason - The reason associated with the feedback.
 * @param {BaseFeedbackParams} baseFeedbackParams - Additional parameters inherited from the
 * base feedbackclass.
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
 * @param {BaseFeedbackParams} baseFeedbackParams - Additional parameters inherited from the
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
    this.endpoint = FLAG_FEEDBACK_EVENT_ENDPOINT;
  }
}

/**
 * Initializes a new RecommendationsEvent object.
 *
 * @param {Object} params - Parameters for initializing the recommendations event.
 * @param {Object[]} params.content - An array of JSON objects,
 * each representing a recommended content item.
 */
export class RecommendationsEvent extends BaseFeedbackEvent {
  constructor({ content, ...baseFeedbackEventParams }) {
    super(baseFeedbackEventParams);
    this.content = content;
    this.endpoint = RECOMMENDATION_EVENT_ENDPOINT;
  }
}

/**
 * Initializes a new RecommendationsInteractionEvent object.
 *
 * @param {Object} params - Parameters for initializing the recommendations interaction event.
 * @param {string} params.recommendation_event_id - The ID of the recommendation event this
 * interaction is for.
 * @param {BaseFeedbackParams} feedbackInteractionEventParams - Parameters inherited from the
 * base feedback interaction event class.
 */
export class RecommendationsInteractionEvent extends BaseFeedbackInteractionEvent {
  constructor({ recommendation_event_id, ...feedbackInteractionEventParams }) {
    super(feedbackInteractionEventParams);
    this.recommendation_event_id = recommendation_event_id;
    this.endpoint = RECOMMENDATION_INTERACTION_EVENT_ENDPOINT;
  }
}

/**
 * Sends a request using the provided feedback object.
 *
 * @function
 *
 * @param {BaseFeedback} feedbackObject - The feedback object to use for the request.
 * @throws {Error} An error if an unsupported HTTP method is specified in the feedback object.
 * @returns {Promise<Object>} A promise that resolves to the response data from the API.
 */
export async function sendRequest(feedbackObject) {
  try {
    const url = feedbackObject.getUrl();
    const data = feedbackObject.getDataObject();
    const method = feedbackObject.getMethod();

    let response;
    switch (method) {
      case 'post':
        response = await client.post(url, data);
        break;
      case 'put':
        response = await client.put(url, data);
        break;
      case 'patch':
        response = await client.patch(url, data);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending feedback request:', error);
    throw error;
  }
}
