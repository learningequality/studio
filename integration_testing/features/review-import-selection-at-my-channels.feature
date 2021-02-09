Feature: Review import selection at *My Channels*

	Background: 
		Given that I am already a registered user
			And I am signed in to Studio
			And I am on *My Channels > edit* page

	Scenario: Review import selection at *My Channels*
		Given that I click the *ADD* button
		Then I see *Import from Channels* button
		When I click the *Import from Channels* button
		Then I see the *Import from Other Channels* page
		When I select <channel> contents
			And I click *REVIEW* button
		Then I see the list of <channel> contents I selected

	Examples:
	| channel |