Feature: Publish a channel

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page for a channel created by me
			And there are unpublished resources

	Scenario: Publish a channel
		When I click the *Publish* button
		Then I see the *Publish channel* side panel
			And I see a checked *Publish channel* radio button
			And I see *You are publishing: Version N*
			And I see a *Version description* field and a *Language* drop-down with a prefilled language
			And I see a unchecked *Publish draft channel* radio button
		When I enter a version description
			And I click the *Publish* button
		Then the side panel closes
			And I see the *Publishing channel 0%* progress indicator to the left of the *Share* drop-down
		When the channel has been published successfully
		Then the progress indicator text changes to *Published NN seconds ago*
			And the *Publish* button remains disabled
		When after a period of time I check my email
		Then I see that I have received a confirmation email that the channel has been published successfully

	Scenario: Publish a draft channel
		Given I am at the *Publish channel* side panel
		When I check the *Publish draft channel* radio-button
			And I click the *Save draft* button
		Then the side panel closes
			And I see a *Draft version is being published* snackbar message
		When the draft channel has been published successfully
		Then the snackbar message changes to *Draft published successfully PREVIEW*
		When I click the *Preview* button
		Then I see the *Preview your draft channel in Kolibri* modal
			And I see a draft token field with the draft token and a copy button to the right
			And I see the following text: *You can use this token to import and preview the draft channel in Kolibri. Please note that the token for the final published channel will be different.*
		When I click the *Dismiss* button
		Then the modal closes
		When I click the *...* button next to the *Publish* button
		Then I see a *Copy token for draft channel*
		When I click on *Copy token for draft channel*
		Then I see the *Preview your draft channel in Kolibri* modal
			And I can copy the token

	Scenario: Publish a large channel
		Given there is an unpublished channel with more than 5000 nodes
			And I am at the *Publish channel* side panel
			And I have filled in all the required fields
		When I click the *Publish* button
		Then the side panel closes
			And I see the *Publishing channel 0%* progress indicator to the left of the *Share* drop-down
		When the channel has been published successfully
		Then the progress indicator text changes to *Published NN seconds ago*
			And the *Publish* button remains disabled
		When after a period of time I check my email
		Then I see that I have received a confirmation email that the channel has been published successfully

	Scenario: Publish a channel with incomplete resources
		Given the channel contains incomplete resources
		When I look to the left of the *Share* drop-down
		Then I see a yellow icon with exclamation
			And I see a the number of incomplete resources
			And when I hover over the icon I see *N resources are incomplete and cannot be published*
		When I click the *Publish* button
		Then I see the *Publish channel* side panel
			And I see text a yellow *N incomplete resources* banner with the following message: *Incomplete resources will not be published and made available for download in Kolibri.*
		When I fill in all the required fields
			And I click the *Publish* button
		Then the side panel closes
			And I see the *Publishing channel 0%* progress indicator to the left of the *Share* drop-down
		When the channel has been published successfully
		Then the progress indicator text changes to *Published NN seconds ago*
			And the *Publish* button remains disabled
		When after a period of time I check my email
		Then I see that I have received a confirmation email that the channel has been published successfully

	Scenario: Publish a channel with resources in different languages
		Given I am at the *Publish channel* side panel
			And the channel contains multiple resources in different languages
		When I click on the *Language* drop-down
		Then I see all of the available languages for the channel
		When I fill in the *Version description* field
			And I select a language from the *Language* drop-down
			And I click the *Publish* button
		Then the side panel closes
			And I see the *Publishing channel 0%* progress indicator to the left of the *Share* drop-down
		When the channel has been published successfully
		Then the progress indicator text changes to *Published NN seconds ago*
			And the *Publish* button remains disabled
		When after a period of time I check my email
		Then I see that I have received a confirmation email that the channel has been published successfully

	Scenario: Attempt to publish a *View-only* channel
		Given I've been invited to view a *View-only* channel
			And I'm not signed in as a studio administrator user
		When I attempt to publish the channel
		Then I see a *View-only* text at the place of the *Publish* button
			And it's not possible to publish the channel
