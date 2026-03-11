const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateRentalPaymentCompletion } = require('./reviewService');

test('allows review when ended rental has all required months paid', () => {
  const rental = {
    status: 'ended',
    startMonth: '2025-01',
    endMonth: '2025-03',
  };
  const payments = [
    { status: 'succeeded', monthsPaid: ['2025-01', '2025-02'] },
    { status: 'succeeded', monthsPaid: ['2025-03'] },
  ];

  const result = evaluateRentalPaymentCompletion(rental, payments);

  assert.equal(result.isPaidInFull, true);
  assert.equal(result.reason, null);
  assert.deepEqual(result.dueMonths, []);
});

test('blocks review before checkout when rental is not ended', () => {
  const rental = {
    status: 'active',
    startMonth: '2025-01',
    endMonth: '2025-02',
  };
  const payments = [{ status: 'succeeded', monthsPaid: ['2025-01', '2025-02'] }];

  const result = evaluateRentalPaymentCompletion(rental, payments);

  assert.equal(result.isPaidInFull, false);
  assert.equal(result.reason, 'stay_not_completed');
});

test('blocks review when there are processing payments', () => {
  const rental = {
    status: 'ended',
    startMonth: '2025-01',
    endMonth: '2025-02',
  };
  const payments = [
    { status: 'succeeded', monthsPaid: ['2025-01'] },
    { status: 'processing', monthsPaid: ['2025-02'] },
  ];

  const result = evaluateRentalPaymentCompletion(rental, payments);

  assert.equal(result.isPaidInFull, false);
  assert.equal(result.reason, 'processing_payment_pending');
});

test('blocks review when dues remain unpaid after checkout', () => {
  const rental = {
    status: 'ended',
    startMonth: '2025-01',
    endMonth: '2025-03',
  };
  const payments = [{ status: 'succeeded', monthsPaid: ['2025-01', '2025-02'] }];

  const result = evaluateRentalPaymentCompletion(rental, payments);

  assert.equal(result.isPaidInFull, false);
  assert.equal(result.reason, 'due_months_pending');
  assert.deepEqual(result.dueMonths, ['2025-03']);
});

test('blocks review when no succeeded rent payments exist', () => {
  const rental = {
    status: 'ended',
    startMonth: '2025-01',
    endMonth: '2025-01',
  };

  const result = evaluateRentalPaymentCompletion(rental, []);

  assert.equal(result.isPaidInFull, false);
  assert.equal(result.reason, 'no_paid_rent_history');
});
