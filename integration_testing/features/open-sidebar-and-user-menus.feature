Feature: Open and close sidebar and user menus
User needs to be able to open and close the sidebar menu and the user menu 

  Background: 
    Given I am signed in to Studio as a non-admin user
		  And I am on any of the tabs (*My Channels*, *Starred*, *View only*, *Content Library*, or *Collections*)

  Scenario: Open and close the sidebar menu
    When I click the hamburger menu button in the upper left screen corner
    Then I see the sidebar menu
	    And I can select any of the options inside
    When I click the *X* button, or anywhere on the browser screen
    Then I don't see the sidebar menu anymore

  Scenario: Open and close the user menu
    When I click the user menu button in the upper right screen corner
    Then I see the user menu
	    And I can select any of the options inside
    When I click the user menu button again, or anywhere on the browser screen
    Then I don't see the user menu anymore