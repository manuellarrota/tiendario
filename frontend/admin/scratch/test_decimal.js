import Decimal from 'decimal.js';

try {
    const d = new Decimal("33,99");
    console.log('Value with comma:', d.toString());
} catch (e) {
    console.log('Error with comma:', e.message);
}

try {
    const d = new Decimal("33.99");
    console.log('Value with dot:', d.toString());
} catch (e) {
    console.log('Error with dot:', e.message);
}
