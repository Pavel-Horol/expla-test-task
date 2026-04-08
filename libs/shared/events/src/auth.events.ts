export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth.user.registered',
} as const;

export interface UserRegisteredEvent {
  userId: string;
}
