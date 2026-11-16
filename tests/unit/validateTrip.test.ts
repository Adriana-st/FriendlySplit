import { tripZSchema, tripQueryZSchema } from "../../src/models/trips";

const validTrip = {
    "name": "Lisbon City Break",
    "destination": "Lisbon",
    "currency": "EUR",
    "startDate": "2026-07-01",
    "endDate": "2026-07-08"
}

describe('Test Trip Validation', () => {
    it('should pass for the following valid data', () => {

        expect(() => tripZSchema.parse(
            validTrip)).not.toThrow();
    });

    it('should pass for the following valid data - no destination', () => {

        expect(() => tripZSchema.parse(
            { ...validTrip, "destination": undefined })).not.toThrow();
    });

    it('should upper-case the currency and trim the name', () => {

        const parsed = tripZSchema.parse(
            { ...validTrip, "name": "  Lisbon  ", "currency": "eur" });

        expect(parsed.currency).toBe("EUR");
        expect(parsed.name).toBe("Lisbon");
    });

    it('should fail for a name that is too short', () => {

        expect(() => tripZSchema.parse(
            { ...validTrip, "name": "ab" })).toThrow();
    });

    it('should fail for a currency that is not 3 letters', () => {

        expect(() => tripZSchema.parse(
            { ...validTrip, "currency": "EURO" })).toThrow();
    });

    it('should fail for a date that does not exist', () => {

        expect(() => tripZSchema.parse(
            { ...validTrip, "startDate": "2026-02-31" })).toThrow();
    });

    it('should fail for a date in the wrong format', () => {

        expect(() => tripZSchema.parse(
            { ...validTrip, "startDate": "01/07/2026" })).toThrow();
    });

    it('should fail when the end date is before the start date', () => {

        expect(() => tripZSchema.parse(
            { ...validTrip, "endDate": "2026-06-01" })).toThrow();
    });

    it('should fail for an unknown property', () => {

        expect(() => tripZSchema.parse(
            { ...validTrip, "isAdmin": true })).toThrow();
    });
});

describe('Test Trip Query Validation', () => {
    it('should apply the defaults when the query string is empty', () => {

        const parsed = tripQueryZSchema.parse({});

        expect(parsed.page).toBe(1);
        expect(parsed.limit).toBe(20);
        expect(parsed.sort).toBe("-startDate");
    });

    it('should turn the text in a query string into numbers', () => {

        const parsed = tripQueryZSchema.parse({ page: "2", limit: "5" });

        expect(parsed.page).toBe(2);
        expect(parsed.limit).toBe(5);
    });

    it('should turn fields into a list', () => {

        const parsed = tripQueryZSchema.parse({ fields: "name,currency" });

        expect(parsed.fields).toEqual(["name", "currency"]);
    });

    it('should fail for an unknown sort field', () => {

        expect(() => tripQueryZSchema.parse({ sort: "colour" })).toThrow();
    });

    it('should fail for a limit above 100', () => {

        expect(() => tripQueryZSchema.parse({ limit: "500" })).toThrow();
    });

    it('should fail for an unknown query parameter, such as an injection attempt', () => {

        expect(() => tripQueryZSchema.parse({ "destination[$ne]": "x" })).toThrow();
    });
});