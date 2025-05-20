Feature: Get channel token after publishing the channel

	Background:
		Given I am signed in to Studio
			And I am on the channel editor page
			And the channel has recently been published

	Scenario: Get channel token after publishing the channel
		When I click on the ellipsis button in the top right corner
			And I click on the *Get token* menu option
		Then I see the *Copy channel token*
			And I see the channel token e.g. hufim-lolib
		When I click on the copy button
		Then a *Token copied* snackbar message
		When I click the *Close* button
		Then the modal closes
