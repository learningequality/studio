Feature: Manage organization members
	An organization admin needs to be able to change the role of organization members and remove them from the organization

	Background:
		Given I am signed in to Studio
			And I am an admin of an organization that has other active members
			And I am at the *Sharing* tab of the organization

	Scenario: See the organization members
		When I look at the *Users* table
		Then I see the *Name*, *Email*, *Role* and *Options* columns
			And I see every active member and every pending invitation of the organization

	Scenario Outline: Change the role of a member
		Given a member has the <current role> role
		When I click the *Options* button for the member
			And I select <action>
		Then I see the member's role change to <new role> in the *Users* table
			And the member sees the role <new role> on the organization's card

		Examples:
		| current role | action      | new role |
		| Viewer       | Make editor | Editor   |
		| Editor       | Make admin  | Admin    |
		| Admin        | Make viewer | Viewer   |

	Scenario: Remove a member from the organization
		When I click the *Options* button for a member
			And I select *Remove from organization*
		Then I see the *Remove from organization* modal with the text *Are you sure you want to remove <email> from this organization?*
		When I click the *Remove* button
		Then I see the *User removed from organization* message
			And I no longer see the member in the *Users* table
			And the member no longer sees the organization on their *My organizations* page
			And the member can no longer open the organization's channels unless they are a direct editor or viewer of them
