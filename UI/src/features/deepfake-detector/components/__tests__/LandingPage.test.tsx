import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from '../../pages/LandingPage';

// Mock the ParticlesBackground component since it uses external scripts
jest.mock('../ParticlesBackground', () => {
  return function MockParticlesBackground() {
    return <div data-testid='particles-background'>Particles Background</div>;
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('LandingPage', () => {
  test('renders main heading', () => {
    renderWithRouter(<LandingPage />);

    const heading = screen.getByText('Deepfake Detector');
    expect(heading).toBeInTheDocument();
  });

  test('renders subtitle', () => {
    renderWithRouter(<LandingPage />);

    const subtitle = screen.getByText('Expose the Fake');
    expect(subtitle).toBeInTheDocument();
  });

  test('renders start detection button', () => {
    renderWithRouter(<LandingPage />);

    const startButton = screen.getByText('Start Detection');
    expect(startButton).toBeInTheDocument();
  });

  test('renders feature cards', () => {
    renderWithRouter(<LandingPage />);

    expect(screen.getByText('Real-time Analysis')).toBeInTheDocument();
    expect(screen.getByText('Confidence Scoring')).toBeInTheDocument();
    expect(screen.getByText('Detailed Reports')).toBeInTheDocument();
    expect(screen.getByText('Easy & Fast Process')).toBeInTheDocument();
    expect(screen.getByText('Advanced Security')).toBeInTheDocument();
    expect(screen.getByText('Auto-Updates')).toBeInTheDocument();
  });

  test('renders particles background', () => {
    renderWithRouter(<LandingPage />);

    const particlesBackground = screen.getByTestId('particles-background');
    expect(particlesBackground).toBeInTheDocument();
  });
});
