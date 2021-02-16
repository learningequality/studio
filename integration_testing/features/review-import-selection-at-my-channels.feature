Feature: Review import selection at *My Channels*

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on *My Channels > edit* page

	Scenario: Review import selection at *My Channels*
		Given I click the *Add* button
		Then I see *Import from Channels* button
		When I click the *Import from Channels* button
		Then I see the *Import from Other Channels* page
		When I select <channel> contents
			And I click *Review* button
		Then I see the list of <channel> contents I selected

	Examples:
	| channel |