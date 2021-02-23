Feature: Import content from the search results
	
	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the <channel> editing page

	Scenario: Import content from the search results
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* page
		When I enter the <search_term> in the search bar
			And I click the *Search* button
		Then I see all the search results for my <search_term>
		When I select a <resource> from the results
			And I click the *Review* button
		Then I see the *Review selections for import* modal
		When I click the *Import* button
		Then I see *Copying Content* modal
			And I see the *Operation is complete!...* notification
		When I click the *Refresh* button
		Then I see the imported <resource> in the <channel>

	Examples:
	| channel | search_term | resource |