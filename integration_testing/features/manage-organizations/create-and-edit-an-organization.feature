Feature: Create and edit an organization
	A user needs to be able to create an organization and keep its details up to date, while only organization admins can change those details

	Background:
		Given I am signed in to Studio
			And I am at the *My organizations* page

	Scenario: See an empty organizations page
		Given I am not a member of any organization
		When I look at the *My organizations* page
		Then I see the *Organizations* heading
			And I see the *New organization* button
			And I see the message *You are not a member of any organizations yet.*

	Scenario: Create an organization
		When I click the *New organization* button
		Then I see the *New organization* page with the *Organization name* and *Organization description* fields
			And I do not see the *Details*, *Channels* and *Sharing* tabs
		When I fill in the *Organization name* and *Organization description* fields
			And I click the *Create organization* button
		Then I see the *Organization created* message
			And I see the *Details*, *Channels* and *Sharing* tabs of the new organization
		When I go back to the *My organizations* page
		Then I see the new organization's card with the role *Admin*

	Scenario: Organization name is required
		Given I am at the *New organization* page
		When I leave the *Organization name* field empty
			And I click the *Create organization* button
		Then I see the *Organization name is required* error
			And no organization is created

	Scenario: Create an organization from *My channels*
		Given I am at *My channels*
		When I click the *Create* button next to the *Filter by organization* drop-down
		Then I see the *New organization* page

	Scenario: Edit the details of an organization as an admin
		Given I am an admin of an organization
		When I click the organization's card
		Then I am at the *Details* tab of the organization
		When I change the *Organization name* and *Organization description*
			And I click the *Save changes* button
		Then I see the *Changes saved* message
			And I see the new name on the organization's card at the *My organizations* page

	Scenario: Open the edit page from the card options
		Given I am a member of an organization
		When I click the *More options* button on the organization's card
			And I select *Edit organization*
		Then I am at the *Details* tab of the organization

	Scenario Outline: Organization details are read-only for non-admin members
		Given I am an active <role> of an organization
		When I open the *Details* tab of the organization
		Then I see the organization fields disabled
			And I see the notice *Only organization admins can edit these details.*
			And I do not see the *Save changes* button

		Examples:
		| role   |
		| editor |
		| viewer |
