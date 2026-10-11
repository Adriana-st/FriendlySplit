import { ExpenseModel } from '../models/expenses';
import { ParticipantModel } from '../models/participants';
import { TripService } from './trips';

const tripService = new TripService();

export interface BalanceParticipant {
  id: string;
  name: string;
}

export interface BalanceExpense {
  paidBy: string;
  amount: number;
  splits: { participant: string; share: number }[];
}

export interface Balance {
  participant: string;
  name: string;
  paid: number; // total this person paid out
  owed: number; // total share of all expenses
  net: number; // paid - owed: positive = is owed money, negative = owes money
}

export interface Settlement {
  from: string; // participant id who pays
  fromName: string;
  to: string; // participant id who receives
  toName: string;
  amount: number;
}

/**
 * Works out who is owed what for a trip, plus a short list of payments that settles everyone up.
 * This is a pure function (no database access) so it is easy to unit test.
 */
export function computeBalances(
  participants: BalanceParticipant[],
  expenses: BalanceExpense[]
): { balances: Balance[]; settlements: Settlement[] } {
  const totals = new Map<string, Balance>(
    participants.map((p) => [p.id, { participant: p.id, name: p.name, paid: 0, owed: 0, net: 0 }])
  );

  for (const expense of expenses) {
    const payer = totals.get(expense.paidBy);
    if (payer) payer.paid += expense.amount;
    for (const split of expense.splits) {
      const person = totals.get(split.participant);
      if (person) person.owed += split.share;
    }
  }

  const balances = [...totals.values()];
  for (const balance of balances) balance.net = balance.paid - balance.owed;

  // Greedy settlement: the person who owes most pays the person who is owed most.
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ ...b, left: -b.net }));
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ ...b, left: b.net }));
  debtors.sort((a, b) => b.left - a.left);
  creditors.sort((a, b) => b.left - a.left);

  const settlements: Settlement[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const amount = Math.min(debtor.left, creditor.left);

    settlements.push({
      from: debtor.participant,
      fromName: debtor.name,
      to: creditor.participant,
      toName: creditor.name,
      amount,
    });

    debtor.left -= amount;
    creditor.left -= amount;
    if (debtor.left === 0) d++;
    if (creditor.left === 0) c++;
  }

  return { balances, settlements };
}

export class BalanceService {

  /** Calculated (not stored) data: how much each person paid, owes, and who should pay whom. */
  async getBalances(tripId: string) {
    const trip = await tripService.requireTrip(tripId);

    const [participants, expenses] = await Promise.all([
      ParticipantModel.find({ trip: tripId }).sort({ createdAt: 1, _id: 1 }).lean(),
      ExpenseModel.find({ trip: tripId }).lean(),
    ]);

    const { balances, settlements } = computeBalances(
      participants.map((p) => ({ id: String(p._id), name: p.name })),
      expenses.map((e) => ({
        paidBy: String(e.paidBy),
        amount: e.amount,
        splits: e.splits.map((s) => ({ participant: String(s.participant), share: s.share })),
      }))
    );

    return {
      trip: tripId,
      currency: trip.currency,
      totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
      balances,
      settlements,
    };
  }
}
