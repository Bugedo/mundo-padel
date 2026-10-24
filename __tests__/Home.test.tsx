import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home page', () => {
  it('renders heading', () => {
    render(<Home />);
    const heading = screen.getByText(/Reservá tu cancha/i);
    expect(heading).toBeInTheDocument();
  });
});
