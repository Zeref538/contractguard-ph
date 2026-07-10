export const CATEGORY_LABEL: Record<string, string> = {
  probation: 'Probation period',
  termination: 'Termination & notice',
  pay: 'Pay & 13th month',
  benefits: 'SSS · PhilHealth · Pag-IBIG',
  hours: 'Hours & overtime',
  ip: 'IP ownership',
  dispute: 'Dispute resolution',
  other: 'Other',
}

export const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c
