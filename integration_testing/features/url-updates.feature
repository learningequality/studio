Feature: URL update when the user switches between channel list
User can see changes at the URL when they switch between channel list

  Background: 
    Given I am signed in to Studio as a non-admin user

    Scenario: URL update at the *My Channels* nav
      When I click *My Channels* nav 
      Then I see that the URL changes

    Scenario: URL update at the *Starred* nav
      When I click *Starred* nav 
      Then I see that the URL changes

    Scenario: URL update at the *View-Only* nav
      When I click *View-Only* nav  
      Then I see that the URL changes

    Scenario: URL update at the *Content Library* nav
      When I click *Content Library* nav  
      Then I see that the URL changes
    
    Scenario: URL update at the *Collections* nav
      When I click *Collections* nav
      Then I see that the URL changes