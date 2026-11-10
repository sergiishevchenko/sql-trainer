import type { DeepPartial } from './index'
import type { Dictionary } from './ru'

export const en: DeepPartial<Dictionary> = {
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    continue: 'Continue'
  },
  nav: {
    dashboard: 'Dashboard',
    learn: 'Learning path',
    exercises: 'Exercises',
    practice: 'Practice',
    playground: 'Playground',
    analytics: 'Analytics',
    achievements: 'Achievements',
    profile: 'Profile',
    logout: 'Log out'
  },
  auth: {
    loginTitle: 'Sign in',
    registerTitle: 'Create account',
    signIn: 'Sign in',
    signUp: 'Sign up'
  }
}
