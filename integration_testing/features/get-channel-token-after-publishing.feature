Feature: Get channel token after publishing the channel

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the <channel> editor page
			And the <channel> has recently been published

	Scenario:	Get channel token after publishing the channel
		When I click on the ellipsis button in the top right corner
			And I click on the *Get token* menu option
		Then I see a modal appears with an option to copy the channel token
		When I click on the copy button
		Then a snackbar appears to confirm the code is copied to the clipboard

	Examples:
	| channel |