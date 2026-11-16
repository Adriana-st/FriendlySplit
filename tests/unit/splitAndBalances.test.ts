import { equalSplit } from "../../src/services/expenses";
import { computeBalances } from "../../src/services/balances";

describe('equalSplit', () => {
    it('divides evenly when possible', () => {

        expect(equalSplit(6000, ['a', 'b', 'c']).map((s) => s.share)).toEqual([2000, 2000, 2000]);
    });

    it('hands leftover cents to the first people so the total is exact', () => {

        const shares = equalSplit(1000, ['a', 'b', 'c']).map((s) => s.share);

        expect(shares).toEqual([334, 333, 333]);
        expect(shares.reduce((x, y) => x + y, 0)).toBe(1000);
    });

    it('returns an empty list when there is nobody to split between', () => {

        expect(equalSplit(1000, [])).toEqual([]);
    });
});

describe('computeBalances', () => {
    const people = [
        { id: 'a', name: 'Adri' },
        { id: 'b', name: 'Maria' },
        { id: 'c', name: 'Tom' },
    ];

    it('works out who is owed money and who owes it', () => {

        const { balances, settlements } = computeBalances(people, [
            {
                paidBy: 'a',
                amount: 3000,
                splits: [
                    { participant: 'a', share: 1000 },
                    { participant: 'b', share: 1000 },
                    { participant: 'c', share: 1000 },
                ],
            },
        ]);

        expect(balances.find((b) => b.participant === 'a')).toMatchObject({ paid: 3000, owed: 1000, net: 2000 });
        expect(balances.find((b) => b.participant === 'b')).toMatchObject({ paid: 0, owed: 1000, net: -1000 });
        expect(settlements).toEqual([
            expect.objectContaining({ from: 'b', to: 'a', amount: 1000 }),
            expect.objectContaining({ from: 'c', to: 'a', amount: 1000 }),
        ]);
    });

    it('always nets everyone to zero after the settlements are paid', () => {

        const { balances, settlements } = computeBalances(people, [
            { paidBy: 'a', amount: 1001, splits: equalSplit(1001, ['a', 'b', 'c']) },
            { paidBy: 'b', amount: 5000, splits: equalSplit(5000, ['a', 'b']) },
            { paidBy: 'c', amount: 777, splits: equalSplit(777, ['a', 'b', 'c']) },
        ]);

        const final = new Map(balances.map((b) => [b.participant, b.net]));
        for (const s of settlements) {
            final.set(s.from, (final.get(s.from) ?? 0) + s.amount);
            final.set(s.to, (final.get(s.to) ?? 0) - s.amount);
        }

        expect([...final.values()].every((net) => net === 0)).toBe(true);
    });

    it('returns zeros when there are no expenses', () => {

        const { balances, settlements } = computeBalances(people, []);

        expect(balances.every((b) => b.net === 0)).toBe(true);
        expect(settlements).toEqual([]);
    });
});