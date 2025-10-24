describe('Deepfake Detector App', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the landing page', () => {
    cy.contains('Deepfake Detector').should('be.visible');
    cy.contains('Expose the Fake').should('be.visible');
  });

  it('should have the start detection button', () => {
    cy.contains('Start Detection').should('be.visible');
    cy.contains('Start Detection').should('be.enabled');
  });

  it('should display feature cards', () => {
    cy.contains('Real-time Analysis').should('be.visible');
    cy.contains('Confidence Scoring').should('be.visible');
    cy.contains('Detailed Reports').should('be.visible');
    cy.contains('Easy & Fast Process').should('be.visible');
    cy.contains('Advanced Security').should('be.visible');
    cy.contains('Auto-Updates').should('be.visible');
  });

  it('should navigate to upload page when clicking start detection', () => {
    cy.contains('Start Detection').click();
    cy.url().should('include', '/upload');
    cy.contains('Upload your video to detect deepfake content').should('be.visible');
  });

  it('should have working upload functionality', () => {
    cy.contains('Start Detection').click();
    cy.url().should('include', '/upload');

    cy.contains('Drop your video here or click to upload').should('be.visible');
    cy.contains('Back to Home').should('be.visible');
  });

  it('should navigate back to home from upload page', () => {
    cy.contains('Start Detection').click();
    cy.url().should('include', '/upload');

    cy.contains('Back to Home').click();
    cy.url().should('not.include', '/upload');
    cy.contains('Deepfake Detector').should('be.visible');
  });
});
