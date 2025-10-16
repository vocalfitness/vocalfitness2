// Global engagement tracker for CTA interactions
class EngagementTracker {
  constructor() {
    this.hasInteracted = false;
  }

  // Mark that user has interacted with a CTA
  markInteraction(ctaType) {
    this.hasInteracted = true;
    sessionStorage.setItem('cta_interacted', 'true');
    sessionStorage.setItem('cta_type', ctaType);
    console.log(`[EngagementTracker] User interacted with: ${ctaType}`);
  }

  // Check if user has interacted
  hasUserInteracted() {
    return this.hasInteracted || sessionStorage.getItem('cta_interacted') === 'true';
  }

  // Mark that popup has been shown
  markPopupShown() {
    sessionStorage.setItem('exit_popup_shown', 'true');
  }

  // Check if popup has been shown in this session
  hasPopupBeenShown() {
    return sessionStorage.getItem('exit_popup_shown') === 'true';
  }

  // Reset tracking (useful for testing)
  reset() {
    this.hasInteracted = false;
    sessionStorage.removeItem('cta_interacted');
    sessionStorage.removeItem('cta_type');
    sessionStorage.removeItem('exit_popup_shown');
  }
}

// Create singleton instance
const engagementTracker = new EngagementTracker();

export default engagementTracker;
