Feature: Export account information

	Background: 
		Given I have a Studio account
			And I am signed in to Studio as a non-admin user
			And I have interacted with various data and channels
			And I am on the *Settings > Account* page

	Scenario: Export account data
		When I click the *Export Data* button
		Then I see a modal appears to confirm export is in-progress
		When I click *Ok* to dismiss the modal
		Then I see the modal disappears

	Scenario: Viewing the exported data
		When I check the Inbox of my email account registered at Studio
		Then I see an email with an attachment that contains my account data