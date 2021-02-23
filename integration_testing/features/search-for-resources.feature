Feature: Search for resources

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the <channel> editing page

	Scenario: Search for resources
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* modal
		When I enter the <search_term> in the search bar
			And I click the *Search* button
		Then I see all the search results for my <search_term>

	Examples:
	| channel | search_term |