import { expenseZSchema, expenseQueryZSchema } from "../../src/models/expenses";

const adri = "a".repeat(24);
const maria = "b".repeat(24);

const validExpense = {
    "paidBy": adri,
    "description": "Taxi",
    "amount": 1000,
    "category": "transport",
    "date": "2026-07-02",
    "splits": [
        { "participant": adri, "share": 600 },
        { "participant": maria, "share": 400 }
    ]
}

describe('Test Expense Validation', () => {
    it('should pass for the following valid data', () => {

        expect(() => expenseZSchema.parse(
            validExpense)).not.toThrow();
    });

    it('should pass for the following valid data - no splits', () => {

        expect(() => expenseZSchema.parse(
            { ...validExpense, "splits": undefined })).not.toThrow();
    });

    it('should fail when the shares do not add up to the amount', () => {

        expect(() => expenseZSchema.parse(
            { ...validExpense, "amount": 5000 })).toThrow();
    });

    it('should fail when a participant appears twice in splits', () => {

        expect(() => expenseZSchema.parse(
            {
                ...validExpense,
                "splits": [
                    { "participant": adri, "share": 500 },
                    { "participant": adri, "share": 500 }
                ]
            })).toThrow();
    });

    it('should fail for an amount of zero', () => {

        expect(() => expenseZSchema.parse(
            { ...validExpense, "amount": 0, "splits": undefined })).toThrow();
    });

    it('should fail for an amount with a decimal part', () => {

        expect(() => expenseZSchema.parse(
            { ...validExpense, "amount": 10.5, "splits": undefined })).toThrow();
    });

    it('should fail for an amount written as text', () => {

        expect(() => expenseZSchema.parse(
            { ...validExpense, "amount": "1000", "splits": undefined })).toThrow();
    });

    it('should fail for a category that is not allowed', () => {

        expect(() => expenseZSchema.parse(
            { ...validExpense, "category": "gambling" })).toThrow();
    });

    it('should fail for a paidBy that is not an id', () => {

        expect(() => expenseZSchema.parse(
            { ...validExpense, "paidBy": "adri" })).toThrow();
    });
});

describe('Test Expense Query Validation', () => {
    it('should pass for a combination of filters', () => {

        expect(() => expenseQueryZSchema.parse(
            { category: "food", minAmount: "1000", maxAmount: "5000", sort: "-amount" })).not.toThrow();
    });

    it('should fail when minAmount is above maxAmount', () => {

        expect(() => expenseQueryZSchema.parse(
            { minAmount: "500", maxAmount: "100" })).toThrow();
    });

    it('should fail for a negative minAmount', () => {

        expect(() => expenseQueryZSchema.parse(
            { minAmount: "-5" })).toThrow();
    });
});