export const SITE_TITLE = 'Thoughts';
export const SITE_AUTHOR = 'Vikram Gorla';
export const SITE_DESCRIPTION = 'Thoughts by Vikram Gorla, on work and on life.';

export const SECTIONS = {
  professional: {
    title: 'Professional',
    description: 'Notes on work, technology and IT.',
  },
  personal: {
    title: 'Personal',
    description: 'Notes on life and everything else.',
  },
} as const;

export type Section = keyof typeof SECTIONS;
