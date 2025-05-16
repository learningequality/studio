// Helper functions and Utils for creating an API request to
// Feedback mechanism endpoints
import { v4 as uuidv4 } from 'uuid';
import client from './client';
import urls from 'shared/urls';

export const FeedbackTypeOptions = {
  imported: 'imported',
  rejected: 'rejected',
  previewed: 'previewed',
  showmore: 'showmore',
  ignored: 'ignored',
  flagged: 'flagged',
};

// This is mock currently, fixed value of URL still to be decided
// referencing the url by name
export const FLAG_FEEDBACK_EVENT_URL = urls[`${'flagged'}_${'list'}`];
export const RECCOMMENDATION_EVENT_URL = urls['recommendations'];
export const RECCOMMENDATION_INTERACTION_EVENT_URL = urls['recommendations-interaction'];

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
    this.URL = FLAG_FEEDBACK_EVENT_URL;
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
  constructor({ content, ...basefeedbackEventParams }) {
    super(basefeedbackEventParams);
    this.content = content;
    this.URL = RECCOMMENDATION_EVENT_URL;
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
    this.URL = RECCOMMENDATION_INTERACTION_EVENT_URL;
  }
}

/**
 * Sends a request using the provided feedback object.
 *
 * @function
 *
 * @param {BaseFeedback} feedbackObject - The feedback object to use for the request.
 * @param {string} [method='post'] - The HTTP method to use (post, put, patch).
 * @throws {Error} Throws an error if the URL is not defined for the feedback object.
 * @returns {Promise<Object>} A promise that resolves to the response data from the API.
 */
export async function sendRequest(feedbackObject, method = 'post') {
  try {
    const url = feedbackObject.getUrl();
    const data = feedbackObject.getDataObject();

    let response;
    switch (method.toLowerCase()) {
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
