Feature: Publishing a channel

	Background:
		Given that I am in the channel editor page
			And I have write access to the channel
			And the channel has had modifications

	Scenario: Publishing a channel
		When I click the *Publish* button in the top right corner
		Then the *Publish modal* appears
			And I see steps for resolving errors and describing new changes
		When I click *Publish*
		Then I see the *Publishing channel* progress bar appear
		When the progress bar reaches 100%
			And I click *Refresh*
		Then the browser refreshes
			And the published version should be updated
			And I receive an email for channel published successfully