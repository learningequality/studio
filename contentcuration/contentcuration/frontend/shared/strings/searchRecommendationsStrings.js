import { createTranslator } from 'shared/i18n';

export const searchRecommendationsStrings = createTranslator('SearchRecommendationsStrings', {
  aboutRecommendationsText: {
    message: 'About Recommendations',
    context: 'A title that introduces how the recommendation system works',
  },
  aboutRecommendationsDescription: {
    message:
      'Our recommendation system learns from the titles and descriptions of what you already have in your channel, and uses that to show you other potentially relevant resources across the Kolibri Library.',
    context: 'A description that explains how the recommendation system works',
  },
  aboutRecommendationsFeedbackDescription: {
    message:
      'Interacting with these recommendations, whether by using them or marking them as not relevant, will help us improve the quality of the recommendations you see.',
    context:
      'A description that explains how the user can help improve the quality of the recommendations',
  },
  goToLocationText: {
    message: 'Go to location',
    context: 'A label for an action that takes the user to a specific location',
  },
  resourcesMightBeRelevantTitle: {
    message: "These resources might be relevant to '{ topic }'",
    context:
      'A title for a list of resources that might be relevant to the user for a currently viewed channel',
  },
  viewMoreLink: {
    message: 'View more',
    context: 'A label for a link that takes the user to a page with more information',
  },
  resourcesInChannelMightBeRelevantTitle: {
    message: "These resources in { channelName } might be relevant to '{ topic }'",
    context:
      'A title for a list of resources that might be relevant to the user for a currently viewed channel based on a specific topic',
  },
  showOtherResourcesLink: {
    message: 'Show other resources anyway',
    context: 'A label for a link that shows the user other resources that might not be relevant',
  },
  showOtherResourcesMessage: {
    message: "We can show you other resources, but they might not be what you're looking for",
    context:
      'A message that explains to the user that there are other resources available, but they might not be relevant to their search',
  },
  tryAgainLink: {
    message: 'Try again',
    context:
      'A label for a link that allows the user to try loading recommended resources again after an error',
  },
  problemShowingResourcesMessage: {
    message: 'There was a problem showing these resources',
    context:
      'A message that explains to the user that an error was encountered while loading recommended resources',
  },
  noDirectMatchesMessage: {
    message:
      'No direct matches found, but there are other resources that might be helpful for your curriculum',
    context:
      'A message that explains to the user that there are no direct matches to their search, but there are other resources that might be helpful',
  },
  showOtherRecommendationsLink: {
    message: 'Show other recommendations',
    context: 'A label for a link that shows the user other recommendations',
  },
  markAsNotRelevantTooltip: {
    message: 'Mark as not relevant',
    context: 'A tooltip that explains to the user that they can mark a resource as not relevant',
  },
  feedbackConfirmationMessage: {
    message: 'Thank you! Your feedback will help us improve your recommendations',
    context: 'A message that thanks the user for their feedback on the provided recommendations',
  },
  giveFeedbackText: {
    message: 'Give feedback',
    context: 'A label that describes the act of providing feedback on a recommended resource',
  },
  undoAction: {
    message: 'Undo',
    context: 'A label for an action that allows the user to undo a previous action',
  },
  closeAction: {
    message: 'Close',
    context: 'A label for an action that closes a dialog or window',
  },
  cancelAction: {
    message: 'Cancel',
    context: 'A label for an action that cancels a previous action',
  },
  submitAction: {
    message: 'Submit',
    context: 'A label for an action that submits a request',
  },
  feedbackSubmittedMessage: {
    message: 'Feedback submitted',
    context: "A message that confirms that the user's feedback has been submitted successfully",
  },
  notRelevantAction: {
    message: 'Not relevant',
    context: 'A label for an action that marks a resource as not relevant',
  },
  giveFeedbackDescription: {
    message:
      'Help us understand why this resource is not relevant for you right now. Check all that apply:',
    context:
      'A description that asks the user to provide feedback on why a resource is not relevant',
  },
  notSuitableForCurriculumLabel: {
    message: 'Not suitable for the curriculum I am using',
    context:
      "A label to a feedback option that explains that the resource is not suitable for the user's curriculum",
  },
  notRelatedToSubjectLabel: {
    message: 'Not related to the subject or knowledge area I am trying to find resources for',
    context:
      "A label to a feedback option that explains that the resource is not related to the user's subject or knowledge area",
  },
  notSuitableForCulturalBackgroundLabel: {
    message: 'Not suitable for the cultural backgrounds and experiences of learners',
    context:
      'A label to a feedback option that explains that the resource is not suitable for the cultural backgrounds and experiences of learners',
  },
  notSpecificLearningActivityLabel: {
    message:
      "Not the type of specific learning activity I'm looking for (e.g. reading text-based material, watching a video, interactive questions, etc.)",
    context:
      'A label to a feedback option that explains that the resource is not the type of specific learning activity the user is looking for',
  },
  tooAdvancedForLearnersLabel: {
    message: "Too advanced for the knowledge level of learners I'm looking for",
    context:
      'A label to a feedback option that explains that the resource is too advanced for the knowledge level of learners',
  },
  tooBasicForLearnersLabel: {
    message: "Too basic for the knowledge level of learners I'm looking for",
    context:
      'A label to a feedback option that explains that the resource is too basic for the knowledge level of learners',
  },
  resourceNotWellMadeLabel: {
    message: "The resource doesn't look or sound well-made enough for use",
    context: 'A label to a feedback option that explains that the resource is not well-made',
  },
  alreadyUsedResourceLabel: {
    message: 'I already used this resource in my channel',
    context:
      'A label to a feedback option that explains that the user has already used the resource in their channel',
  },
  otherLabel: {
    message: 'Other',
    context:
      'A label to a feedback option that explains that the resource is not relevant for another reason',
  },
  enterFeedbackLabel: {
    message: 'Enter your feedback',
    context:
      'A label to an input that asks the user to enter their specific reason for marking a resource as not relevant',
  },
  feedbackFailedMessage: {
    message: 'Feedback submission failed',
    context:
      'A message that explains to the user that there was an error submitting their feedback',
  },
  feedbackInputValidationMessage: {
    message: 'Please enter your feedback',
    context: 'A validation message that prompts the user to enter feedback before submitting',
  },
});
