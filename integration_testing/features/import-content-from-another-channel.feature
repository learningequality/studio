Feature: Import content from another channel

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the <channel> editing page

	Scenario: Import content from another channel
		When I click the *Add* button
			And I select the *Import from Channels* option
		Then I see the *Import from Other Channels* page
			And I see a list of channels that I have access to
		When I expand <channel> which I have access to
			And select some content under <channel>
			And press *Review* button
		Then I see the review screen
		When I finish reviewing my selections
			And I press *Import* button
		Then I see the *Copying content* modal which displays the import progress
			And I don't see the *Import from Other channels* page
			And I see the <channel> editing page again 

#Import content from an available/accessible channel

	Examples:
	| channel |