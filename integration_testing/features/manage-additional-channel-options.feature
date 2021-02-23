Feature: Access and use additional options on channel list
	User needs to be able to access additional options to manage channels from the channel list

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on any of the tabs (*My Channels*, *Starred*, *View only*, or *Content Library*)

	Scenario: Edit channel details
		When I click the *⋮* button (ellipsis button) for more options
			And I select *Edit channel details*
		Then I 
			And I 
		When I 
		Then I