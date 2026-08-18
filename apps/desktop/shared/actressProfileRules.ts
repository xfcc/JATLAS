export type ActressStatus = 'active' | 'retired';

export function actressStatusFromCareerTo(careerTo: string | null | undefined): ActressStatus {
  return careerTo?.trim() ? 'retired' : 'active';
}
