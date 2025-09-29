Feature: Create a channel

	Background:
		Given I am signed in to Studio
			And I am at *My Channels* tab

	Scenario: Create a new channel
		When I click the *New channel* button
		Then I see the *New channel* page
		When I upload an image file as a channel thumbnail (optional)
			And I enter a channel name
			And I select a language
			And I enter channel description (optional)
			And I fill in the default copyright fields (optional)
			And I click the *Create* button
		Then I am at the channel editor view
			And I see the title of the channel to the left
			And I see a disabled *Publish* button
			And I see *Click "ADD" to start building your channel Create, upload, or import resources from other channels*
			And I see a blue *Add* button
