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

// Someone who still has money to pay or to receive while we work out the settlements
interface PersonLeft {
  id: string;
  name: string;
  left: number; // how much they still have to pay (debtor) or receive (creditor)
}

/**
 * Works out what each person paid and owes, plus a list of payments that settles everyone up.
 * This is a pure function (no database access) so it is easy to unit test.
 */
export function computeBalances(
  participants: BalanceParticipant[],
  expenses: BalanceExpense[]
): { balances: Balance[]; settlements: Settlement[] } {
  // Start at zero for each participant
  const balances: Balance[] = [];
  for (const p of participants) {
    balances.push({ participant: p.id, name: p.name, paid: 0, owed: 0, net: 0 });
  }

  // Go through each expense: add what the payer paid, and each person's share to what they owe. 
  for (const expense of expenses) {
    for (const balance of balances) {
      if (balance.participant === expense.paidBy) {
        balance.paid += expense.amount;
      }
      for (const split of expense.splits) {
        if (split.participant === balance.participant) {
          balance.owed += split.share;
        }
      }
    }
  }

  // Net = paid - owed
  for (const balance of balances) {
    balance.net = balance.paid - balance.owed;
  }

  // Split people into debtors and creditors
  const debtors: PersonLeft[] = [];
  const creditors: PersonLeft[] = [];
  for (const balance of balances) {
    if (balance.net < 0) {
      debtors.push({ id: balance.participant, name: balance.name, left: -balance.net });
    } else if (balance.net > 0) {
      creditors.push({ id: balance.participant, name: balance.name, left: balance.net });
    }
  }

  // Biggest amounts first, so the biggest debts are settled first 
  debtors.sort((a, b) => b.left - a.left);
  creditors.sort((a, b) => b.left - a.left);

  // Each debtor pays creditors in turn until their debt is cleared
  const settlements: Settlement[] = [];
  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.left === 0) {
        break; // this debtor has paid off their debt
      } 
      if (creditor.left === 0) {
        continue; // this creditor has been paid off, go to the next one
      }

      // Pay as much as possible: whichever is smaller, the debt or what the creditor is still owed
      const amount = Math.min(debtor.left, creditor.left);
      settlements.push({
        from: debtor.id,
        fromName: debtor.name,
        to: creditor.id,
        toName: creditor.name,
        amount: amount
      });

      debtor.left -= amount;
      creditor.left -= amount;
    }
  }

  return { balances, settlements };
}

export class BalanceService {

  // Balances are worked out from the expenses every time - they are never stored,
  // so they can never be out of date.
  async getBalances(tripId: string) {
    const trip = await tripService.requireTrip(tripId);

    const [participants, expenses] = await Promise.all([
      ParticipantModel.find({ trip: tripId }).sort({ createdAt: 1, _id: 1 }).lean(),
      ExpenseModel.find({ trip: tripId }).lean(),
    ]);

    // Turn the database ids into plain text, so they can be compared with ===
    const people: BalanceParticipant[] = participants.map((p) => ({ 
      id: String(p._id), 
      name: p.name }));
    const simpleExpenses: BalanceExpense[] = expenses.map((e) => ({
      paidBy: String(e.paidBy),
      amount: e.amount,
      splits: e.splits.map((s) => ({ participant: String(s.participant), share: s.share })),
    }));

    const { balances, settlements } = computeBalances(people, simpleExpenses);

    let totalSpent = 0;
    for (const expense of expenses) {
      totalSpent += expense.amount;
    }

    return {
      trip: tripId,
      currency: trip.currency,
      totalSpent: totalSpent,
      balances,
      settlements,
    };
  }
}
