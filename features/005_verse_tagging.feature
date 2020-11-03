# features/005_verse_tagging.feature

Feature: Verse tagging
  In order to categorize verses I can assign tags to each individual verse.

  @uninstall-kjv-after-scenario
  @remove-last-tag-after-scenario
  Scenario: Creating and assigning a tag to one verse
    Given the KJV is the only translation installed
    And I open the book selection menu
    And I select the book Ephesians
    And I create the tag "God's love"
    And I select the verse "Ephesians 2:4"
    When I assign the tag "God's love" to the current verse selection
    Then the tag "God's love" is assigned to "Ephesians 2:4" in the database
    And the tag "God's love" is visible in the bible browser at the selected verse