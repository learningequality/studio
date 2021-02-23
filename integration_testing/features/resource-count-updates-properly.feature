Feature: Resource count gets updated properly

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the <channel> editing page

	Scenario: Resource count gets updated properly
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* page
		When I select the <topic> from <import_channel>
		Then I see the *N topics, '<num_resources>' resources* notification at the bottom
		When I select a single <resource>
		Then I see the *N topics, '<num_resources>+1' resources* notification at the bottom
		When I deselect the <topic>
		Then I see the *0 topics, 1 resource* notification at the bottom of the page

	Examples:
	| channel | topic | import_channel | resource |