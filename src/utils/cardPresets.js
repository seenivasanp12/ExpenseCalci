// Starting-point reference data for the "Add Card" form — typical joining/annual
// fees as commonly published, NOT live rates. Every field is editable in the form;
// treat this as a convenience autofill, not a source of truth (banks change fees
// and run promos often, so verify against your actual card/statement).

export const BANK_PRESETS = [
  {
    id: 'icici', label: 'ICICI Bank',
    cards: [
      { id: 'amazon-pay-icici', label: 'Amazon Pay ICICI', joiningFee: 0,   annualFee: 0,   waiverNote: 'Lifetime free' },
      { id: 'coral',            label: 'Coral',             joiningFee: 500, annualFee: 500, waiverNote: 'Waived above ₹1.5L annual spend' },
      { id: 'rubyx',            label: 'Rubyx',             joiningFee: 1500, annualFee: 1500, waiverNote: 'Waived above ₹3L annual spend' },
    ],
  },
  {
    id: 'hdfc', label: 'HDFC Bank',
    cards: [
      { id: 'millennia', label: 'Millennia', joiningFee: 1000, annualFee: 1000, waiverNote: 'Waived above ₹1L annual spend' },
      { id: 'regalia',   label: 'Regalia',   joiningFee: 2500, annualFee: 2500, waiverNote: 'Waived above ₹3L annual spend' },
      { id: 'moneyback', label: 'MoneyBack', joiningFee: 500,  annualFee: 500,  waiverNote: 'Waived above ₹50k annual spend' },
    ],
  },
  {
    id: 'sbi', label: 'SBI Card',
    cards: [
      { id: 'simplyclick', label: 'SimplyCLICK', joiningFee: 499, annualFee: 499, waiverNote: 'Waived above ₹1L annual spend' },
      { id: 'simplysave',  label: 'SimplySAVE',   joiningFee: 499, annualFee: 499, waiverNote: 'Waived above ₹1L annual spend' },
      { id: 'prime',       label: 'Prime',        joiningFee: 2999, annualFee: 2999, waiverNote: 'Waived above ₹3L annual spend' },
    ],
  },
  {
    id: 'axis', label: 'Axis Bank',
    cards: [
      { id: 'ace',       label: 'Ace',       joiningFee: 499, annualFee: 499, waiverNote: 'Waived above ₹2L annual spend' },
      { id: 'flipkart',  label: 'Flipkart',  joiningFee: 500, annualFee: 500, waiverNote: 'Waived above ₹2L annual spend' },
    ],
  },
  {
    id: 'kotak', label: 'Kotak Mahindra Bank',
    cards: [
      { id: '811',    label: '811 #Dream Different', joiningFee: 0, annualFee: 0, waiverNote: 'Lifetime free' },
      { id: 'league', label: 'League Platinum',      joiningFee: 499, annualFee: 499, waiverNote: 'Waived above ₹80k annual spend' },
    ],
  },
]

export const getBank = (id) => BANK_PRESETS.find(b => b.id === id) || null
export const getCardPreset = (bankId, cardId) => getBank(bankId)?.cards.find(c => c.id === cardId) || null
