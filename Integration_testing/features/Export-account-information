Feature: Export account information

	Background: 
		Given I have a Studio account
			And I have interacted with various data and channels
			And I am on the *Account* tab in *Setttings* page

	Scenario: Exporting account data
		When I click the *Export Data* button
		Then I see a modal appear saying export is in-progress
		When I click *Ok* to dismiss the modal
		Then I see the modal disappear

	Scenario: Viewing the exported data
		When I check the Inbox of my email account registered at Studio
		Then I see an email with an attachment containing my account data