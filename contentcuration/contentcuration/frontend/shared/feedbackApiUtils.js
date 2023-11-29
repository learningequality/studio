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

const RECCOMMENDATION_EVENT_URL = '/api/recommendationevent/';
const RECCOMMENDATION_INTERACTION_EVENT_URL = '/api/reccomendationinteractionevent/';
const FLAG_FEEDBACK_EVENT_URL = '/api/flagged/';

//Detrmine the feedbackType
function determineFeedbackType(feedbackObject) {
  let feedbackType;
  if ('completed_at' in feedbackObject) {
    feedbackType = 'RecommendationsEvent';
  } else if ('recommendation_event_id' in feedbackObject) {
    feedbackType = 'RecommendationsInteractionEvent';
  } else if ('target_topic_id' in feedbackObject) {
    feedbackType = 'FlagFeedbackEvent';
  } else {
    // Handle unknown feedback types if needed
    throw new Error('Unknown feedback type');
  }
  return feedbackType;
}

//Create endpoint URL according to feedbackType
function determineFeedbackUrl(feedbackType) {
  let endpoint;
  switch (feedbackType) {
    case 'RecommendationsEvent':
      endpoint = RECCOMMENDATION_EVENT_URL;
      break;
    case 'RecommendationsInteractionEvent':
      endpoint = RECCOMMENDATION_INTERACTION_EVENT_URL;
      break;
    case 'FlagFeedbackEvent':
      endpoint = FLAG_FEEDBACK_EVENT_URL;
      break;
    default:
      // Handle unknown feedback types if needed
      throw new Error('Unknown feedback type');
  }
  return endpoint;
}

// Common function for creating base feedback object
function createBaseFeedback({ context = {}, contentnode_id, content_id }) {
  const id = uuidv4();
  const created_at = new Date();
  return {
    id,
    context: context,
    created_at,
    contentnode_id: contentnode_id,
    content_id: content_id,
  };
}

// Common function for creating base feedback event object
function createBaseFeedbackEvent({ user, target_channel_id, ...baseFeedbackParams }) {
  const baseFeedback = createBaseFeedback(baseFeedbackParams);
  return {
    user,
    target_channel_id,
    ...baseFeedback,
  };
}

// Common function for creating base feedback interaction event object
function createBaseFeedbackInteractionEvent({
  feedback_type,
  feedback_reason,
  ...baseFeedbackParams
}) {
  const baseFeedback = createBaseFeedback(baseFeedbackParams);
  return {
    feedback_type,
    feedback_reason,
    ...baseFeedback,
  };
}

// Helper function that accumulates data for RecommendationsEvent Class
export const RecommendationsEvent = function createRecommendationsEvent({
  user,
  target_channel_id,
  context,
  contentnode_id,
  content_id,
  content,
}) {
  const baseFeedbackEvent = createBaseFeedbackEvent({
    user,
    target_channel_id,
    context,
    contentnode_id,
    content_id,
  });
  return {
    completed_at: null, // needs to be figured out
    content,
    ...baseFeedbackEvent,
  };
};

// Helper function that accumulates data for RecommendationsInteractionEvent Class
export const RecommendationsInteractionEvent = function createRecommendationsInteractionEvent({
  feedback_type,
  feedback_reason,
  context,
  contentnode_id,
  contentId,
  recommendation_event_id,
}) {
  const baseFeedbackInteractionEvent = createBaseFeedbackInteractionEvent({
    feedback_type,
    feedback_reason,
    context,
    contentnode_id,
    contentId,
  });
  return {
    recommendation_event_id,
    ...baseFeedbackInteractionEvent,
  };
};

// Helper function that accumulates data for FlagFeedbackEvent Class
export const FlagFeedbackEvent = function createFlagFeedbackEvent({
  user,
  target_channel_id,
  context,
  contentnode_id,
  contentId,
  feedback_type,
  feedback_reason,
  target_topic_id,
}) {
  const baseFeedbackEvent = createBaseFeedbackEvent({
    user,
    target_channel_id,
    context,
    contentnode_id,
    contentId,
  });
  const baseFeedbackInteractionEvent = createBaseFeedbackInteractionEvent({
    feedback_type,
    feedback_reason,
    context,
    contentnode_id,
    contentId,
  });
  return {
    target_topic_id,
    ...baseFeedbackEvent,
    ...baseFeedbackInteractionEvent,
  };
};

// Hit the feedback API'S
export const sendFeedbackRequest = async function createAndSendFeedbackRequest(feedbackObject) {
  const feedbackType = determineFeedbackType(feedbackObject);
  const endpoint = determineFeedbackUrl(feedbackType);
  try {
    const response = await client.post(endpoint, feedbackObject);
    console.log('API response:', response.data);
  } catch (error) {
    console.log(error);
  }
};
