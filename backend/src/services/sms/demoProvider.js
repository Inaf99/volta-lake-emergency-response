// DEMO SMS PROVIDER
// Simulates sending an SMS without any external account or network call.
// This is what makes the project demonstrable in class without a paid
// Twilio number. It always "succeeds" so the workflow can be shown
// end-to-end, and logs a clear [SMS SIMULATION] block to the terminal.

async function send({ to, message }) {
  console.log('\n========== SMS SIMULATION ==========');
  console.log('Recipient:', to);
  console.log('Message:');
  console.log(message);
  console.log('Status: SIMULATED SUCCESS');
  console.log('=====================================\n');

  return {
    status: 'SIMULATED',
    providerMessageId: `demo_${Date.now()}`,
    errorMessage: null,
  };
}

module.exports = { send };
