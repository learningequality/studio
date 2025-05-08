Feature: Create a channel

	Background:
		Given I am signed in to Studio
			And I am on the *My Channels* tab

	Scenario: Create a new channel
		Given I am signed in to Studio
			And I am at *My Channels* tab
		When I click the *New channel* button
		Then I see the *New channel* page
		When I enter a channel name
			And I select a language
			And I enter channel description (optional)
			And I fill in the default copyright fields (optional)
			And I upload an image file as a channel thumbnail (optional)
			And I click the *Create* button
		Then I am at the channel editor view
