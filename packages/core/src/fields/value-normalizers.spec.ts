import { describe, expect, it } from 'vitest';
import {
    brazilPhone,
    contact,
    instagramHandle,
    maskPhone,
    personName
} from './value-normalizers.js';

describe('field validation', () => {
    it('phones: landline and mobile, with or without +55', () => {
        expect(brazilPhone('11912345678')).toBe('(11) 91234-5678');
        expect(brazilPhone('+55 (11) 4000-1234')).toBe('(11) 4000-1234');
        expect(brazilPhone('11812345678')).toBeNull();
        expect(brazilPhone('1234')).toBeNull();
        expect(brazilPhone('(01) 4000-1234')).toBeNull();
    });
    it('instagram: handle or profile link, normalized', () => {
        expect(instagramHandle('@Casa.Verde')).toBe('casa.verde');
        expect(instagramHandle('https://instagram.com/casaverde/')).toBe('casaverde');
        expect(instagramHandle('casa..verde')).toBeNull();
        expect(instagramHandle('casa verde')).toBeNull();
    });
    it('names and contacts', () => {
        expect(personName('  Maria   da Silva ')).toBe('Maria da Silva');
        expect(personName("João D'Ávila")).toBe("João D'Ávila");
        expect(personName('Maria2')).toBeNull();
        expect(contact('gerente@casa.com')).toBe('gerente@casa.com');
        expect(contact('11 91234-5678')).toBe('(11) 91234-5678');
        expect(contact('gerente@')).toBeNull();
    });
    it('masks a phone as it is typed', () => {
        expect(maskPhone('119')).toBe('(11) 9');
        expect(maskPhone('1191234567')).toBe('(11) 9123-4567');
        expect(maskPhone('11912345678')).toBe('(11) 91234-5678');
    });
});
