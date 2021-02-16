Feature: Import content from the search results at *My Channels* <channel>

	Background: 
		Given I am already a registered user
			And I am signed in to Studio as a non-admin user
			And I am on *My Channels > edit* page

	Scenario: Import content from the search results at *My Channels* <channel>
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* modal
		When I select a <topic> and a <resource> from the public channels
			And I click the *Review* button
		Then I see the *Review selections for import* page
		When I click the arrow button to open the topic tree for <topic>
		Then I see all the resources of the <topic> topic
		When I click the *Import* button
		Then I see *Copying Content* modal

	Examples:
	| channel |	topic	| resource |