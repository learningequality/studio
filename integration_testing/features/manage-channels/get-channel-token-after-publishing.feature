Feature: Get channel token after publishing the channel

	Background:
		Given I am signed in to Studio
			And I am on the channel editor page
			And the channel has recently been published

	Scenario: Get channel token after publishing the channel
		When I click on the ellipsis button in the top right corner
			And I click on the *Get token* menu option
		Then I see the *Copy channel token* modal
			And I see the channel token e.g. nakav-mafak
		When I click on the copy button
		Then I see a *Token copied* snackbar message
		When I click the *Close* button
		Then the modal closes

	Scenario: Copy the channel token for a draft channel
		Given I have published a draft version of the channel
		When I click on the ellipsis button in the top right corner
			And I click on the *Copy token for a draft channel* menu option
		Then I see the *Preview your draft channel in Kolibri* modal
			And I see the draft channel token e.g. nakav-mafak
		When I click on the copy button
		Then I see a *Token copied* snackbar message
		When I click the *Close* button
		Then the modal closes

	Scenario: Share the channel token after publishing the channel
		When I click the *Share* button
			And I click on the *Share token* menu option
		Then I see the *Copy channel token* modal
			And I see the channel token e.g. nakav-mafak
		When I click on the copy button
		Then I see a *Token copied* snackbar message
		When I click the *Close* button
		Then the modal closes
