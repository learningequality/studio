Feature: User gets the channel token after publishing the channel

	Background:
		Given that I am on the <channel> editor page
			And the <channel> has recently been published

	Scenario:	User gets the channel token after publishing the channel
		When I click on the ellipsis icon in the top right corner
			And I click on the *Get token* menu option
		Then I see a modal appears with an option to copy the channel token
		When I click on the copy icon
		Then a snackbar appears to confirm the code is copied to the clipboard

	Examples:
	| channel |