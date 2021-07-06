Feature: Publish a channel

	Background:
		Given I am signed in to Studio
			And I am in the channel editor page
			And I have write access to the channel
			And the channel has had modifications

	Scenario: Publish a channel
		When I click the *Publish* button in the top right corner
		Then the *Publish modal* appears
			And I see steps for resolving errors and describing new changes
		When I click *Publish*
		Then I see the *Publishing channel* progress bar appears
		When the progress bar reaches 100%
			And I click *Refresh*
		Then the browser refreshes
			And the published version is updated
			And I receive an email for channel published successfully

	Scenario: Publish a large channel
		When the channel as at least 5000 nodes
			And I click the *Publish* button in the top right corner
		Then the *Publish modal* appears
			And I see a loading spinner while it loads the channel's size
			And I see the *Continue* button is disabled
		When the channel's size has loaded
		Then the loading spinner disappears
			And I see the *Continue* button isn't disabled
			And I can continue publishing
