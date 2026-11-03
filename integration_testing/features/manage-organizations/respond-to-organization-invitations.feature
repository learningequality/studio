Feature: Respond to organization invitations
	A user who has been invited to an organization needs to be able to accept or decline the invitation

	Background:
		Given I am signed in to Studio
			And an organization admin has invited me to an organization
			And I am at the *My organizations* page

	Scenario Outline: See a pending invitation
		Given I have been invited with the <role> role
		When I look at the *My organizations* page
		Then I see the *You have 1 invitation* banner
			And I see the text <invitation text>

		Examples:
		| role   | invitation text                                |
		| Viewer | <sender> has invited you to view <organization> |
		| Editor | <sender> has invited you to edit <organization> |
		| Admin  | <sender> has invited you to own <organization>  |

	Scenario: Accept an invitation
		When I click the accept icon button with the tooltip *Accept invitation to <organization>*
		Then I no longer see the invitation
			And I see the organization's card with the role I was invited with
			And the organization admin sees me in the *Users* table with that role

	Scenario: Decline an invitation
		When I click the decline icon button with the tooltip *Decline invitation to <organization>*
		Then I see the *Declining invitation* modal with the text *Are you sure you want to decline this invitation?*
		When I click the *Decline* button
		Then I no longer see the invitation
			And I do not see the organization's card
			And the organization admin no longer sees me as pending in the *Users* table

	Scenario: Cancel declining an invitation
		When I click the decline icon button for the invitation
			And I click the *Cancel* button in the *Declining invitation* modal
		Then I still see the invitation
