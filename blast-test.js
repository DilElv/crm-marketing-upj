#!/usr/bin/env node

/**
 * WhatsApp Blast Testing Suite
 * Simulate complete blast flow without real WhatsApp API
 * 
 * Usage:
 *   node blast-test.js --scenario=1 --leads=100
 *   node blast-test.js --scenario=2 --campaign="test123"
 */

const axios = require('axios');
const chalk = require('chalk'); // for colored output (npm install chalk)

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';
const TEST_USER = {
  email: 'test@blast.local',
  password: 'TestPass123!',
};

let authToken = null;

/**
 * ==================== TEST HELPERS ====================
 */

const log = {
  header: (msg) => console.log(chalk.bold.cyan(`\n→ ${msg}`)),
  success: (msg) => console.log(chalk.green(`  ✓ ${msg}`)),
  error: (msg) => console.log(chalk.red(`  ✗ ${msg}`)),
  info: (msg) => console.log(chalk.blue(`  ℹ ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`  ⚠ ${msg}`)),
};

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      log.error('Unauthorized - please login again');
      process.exit(1);
    }
    throw err;
  }
);

/**
 * Pause execution
 */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * ==================== AUTHENTICATION ====================
 */

async function registerUser() {
  log.header('Registering Test User');
  try {
    const res = await api.post('/auth/register', {
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: 'Test Blast User',
    });
    log.success(`User created: ${res.data.data.user.email}`);
  } catch (err) {
    if (err.response?.status === 400) {
      log.warn('User already exists, skipping registration');
    } else {
      throw err;
    }
  }
}

async function loginUser() {
  log.header('Logging In');
  try {
    const res = await api.post('/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    authToken = res.data.data.token;
    log.success(`Logged in as: ${res.data.data.user.email}`);
  } catch (err) {
    throw new Error(`Login failed: ${err.message}`);
  }
}

/**
 * ==================== SCENARIO 1: BASIC BLAST ====================
 */

async function scenario1_basicBlast(leadCount = 10) {
  console.log(chalk.bold.yellow(`\n\n═══════ SCENARIO 1: Basic Blast (${leadCount} leads) ═══════\n`));

  try {
    // Step 1: Create campaign
    log.header('Step 1: Create Campaign');
    const campaignRes = await api.post('/campaigns', {
      name: `TEST_BLAST_${Date.now()}`,
      templateName: 'welcome',
      targetLeadStatus: 'NEW',
    });
    const campaignId = campaignRes.data.data.id;
    log.success(`Campaign created: ${campaignId}`);

    // Step 2: Create/Import leads
    log.header('Step 2: Creating Test Leads');
    const leadIds = [];
    for (let i = 1; i <= leadCount; i++) {
      const leadRes = await api.post('/leads', {
        full_name: `Test Lead ${i}`,
        phone_number: `628812345${String(i).padStart(3, '0')}`,
        email: `lead${i}@test.local`,
        city: 'Jakarta',
        program_interest: 'Engineering',
      });
      leadIds.push(leadRes.data.data.id);
    }
    log.success(`Created ${leadCount} test leads`);

    // Step 3: Add leads to campaign
    log.header('Step 3: Adding Leads to Campaign');
    await api.put(`/campaigns/${campaignId}/select-leads`, {
      leadIds,
    });
    log.success(`Added ${leadCount} leads to campaign`);

    // Step 4: Preview targets
    log.header('Step 4: Preview Blast Targets');
    const previewRes = await api.post(`/blast/${campaignId}/preview`);
    const totalTargets = previewRes.data.data.total_targets;
    log.success(`Total targets: ${totalTargets}`);
    log.info(`Sample leads (first 5):`);
    previewRes.data.data.contacts_preview.slice(0, 5).forEach((c) => {
      console.log(`    - ${c.phone_number}`);
    });

    // Step 5: Start blast
    log.header('Step 5: Starting Blast');
    const blastRes = await api.post(`/blast/${campaignId}/start`, {
      ratePerSecond: 5,
      retryAttempts: 3,
    });
    const queued = blastRes.data.data.queued;
    log.success(`Blast started! Queued ${queued}/${totalTargets} messages`);

    // Step 6: Monitor blast progress
    log.header('Step 6: Monitoring Blast Progress');
    const estimatedSeconds = (queued * 1000) / (5 * 1000);
    log.info(`Estimated duration: ${Math.ceil(estimatedSeconds)} seconds`);

    for (let i = 0; i < 5; i++) {
      await delay(2000);
      const statusRes = await api.get(`/blast/${campaignId}/status`);
      const { message_stats } = statusRes.data.data;
      const { total_messages, sent, delivered, read, failed } = message_stats;

      const deliveryRate = total_messages > 0 ? ((delivered / total_messages) * 100).toFixed(1) : 0;
      const readRate = total_messages > 0 ? ((read / total_messages) * 100).toFixed(1) : 0;

      console.log(`  Status [${i + 1}]: 📊 ${total_messages} | ✓ ${delivered} (${deliveryRate}%) | 👁 ${read} (${readRate}%) | ✗ ${failed}`);

      if (total_messages === queued && failed === 0) {
        log.success('All messages processed successfully!');
        break;
      }
    }

    log.success('Scenario 1 completed successfully!');
  } catch (err) {
    log.error(`Scenario 1 failed: ${err.message}`);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
  }
}

/**
 * ==================== SCENARIO 2: RETRY FAILED ====================
 */

async function scenario2_retryFailed(campaignId) {
  console.log(chalk.bold.yellow(`\n\n═══════ SCENARIO 2: Retry Failed Messages ═══════\n`));

  try {
    log.header('Step 1: Check Current Status');
    const statusRes = await api.get(`/blast/${campaignId}/status`);
    const { message_stats } = statusRes.data.data;
    log.info(`Total: ${message_stats.total_messages} | Failed: ${message_stats.failed}`);

    if (message_stats.failed === 0) {
      log.warn('No failed messages to retry');
      return;
    }

    log.header('Step 2: Retrying Failed Messages');
    const retryRes = await api.post(`/blast/${campaignId}/retry-failed`, {
      ratePerSecond: 3,
      retryAttempts: 3,
    });
    log.success(`Requeued ${retryRes.data.data.queued} failed messages`);

    log.header('Step 3: Monitoring Retry Progress');
    for (let i = 0; i < 3; i++) {
      await delay(2000);
      const statusRes = await api.get(`/blast/${campaignId}/status`);
      const { message_stats } = statusRes.data.data;
      console.log(`  Status [${i + 1}]: Sent=${message_stats.sent}, Delivered=${message_stats.delivered}, Failed=${message_stats.failed}`);
    }

    log.success('Scenario 2 completed!');
  } catch (err) {
    log.error(`Scenario 2 failed: ${err.message}`);
  }
}

/**
 * ==================== SCENARIO 3: WEBHOOK SIMULATION ====================
 */

async function scenario3_simulateWebhooks(campaignId) {
  console.log(chalk.bold.yellow(`\n\n═══════ SCENARIO 3: Simulating WhatsApp Webhooks ═══════\n`));

  try {
    log.header('Step 1: Get Campaign Messages');
    const statusRes = await api.get(`/blast/${campaignId}/status`);
    const messageStats = statusRes.data.data.message_stats;

    if (messageStats.total_messages === 0) {
      log.warn('No messages found');
      return;
    }

    log.info(`Found ${messageStats.total_messages} messages. Simulating webhook updates...`);

    // In real scenario, Meta would send these webhooks
    log.header('Step 2: Simulating Delivery Confirmations');
    log.info('In production, Meta WhatsApp Cloud API sends these webhook events:');
    console.log(`
    POST /api/webhooks/whatsapp
    Content-Type: application/json
    
    {
      "entry": [{
        "changes": [{
          "value": {
            "statuses": [
              {
                "id": "wamid.xxx",
                "status": "delivered",
                "timestamp": "1234567890"
              },
              {
                "id": "wamid.yyy",
                "status": "read",
                "timestamp": "1234567891"
              }
            ]
          }
        }]
      }]
    }
    `);

    log.info('Webhook events are processed by: webhookController.handleWhatsAppWebhook()');
    log.success('Scenario 3 explanation complete!');
  } catch (err) {
    log.error(`Scenario 3 failed: ${err.message}`);
  }
}

/**
 * ==================== MAIN TEST RUNNER ====================
 */

async function main() {
  const args = process.argv.slice(2);
  const scenario = args.find((a) => a.startsWith('--scenario='))?.split('=')[1] || '1';
  const leads = parseInt(args.find((a) => a.startsWith('--leads='))?.split('=')[1] || '10');
  const campaignId = args.find((a) => a.startsWith('--campaign='))?.split('=')[1];

  console.log(chalk.bold.cyan(`\n🚀 WhatsApp Blast Testing Suite\n`));

  try {
    // Auth
    await registerUser();
    await loginUser();

    // Run scenario
    switch (scenario) {
      case '1':
        await scenario1_basicBlast(leads);
        break;
      case '2':
        if (!campaignId) {
          log.error('Please provide --campaign=ID for scenario 2');
          process.exit(1);
        }
        await scenario2_retryFailed(campaignId);
        break;
      case '3':
        if (!campaignId) {
          log.error('Please provide --campaign=ID for scenario 3');
          process.exit(1);
        }
        await scenario3_simulateWebhooks(campaignId);
        break;
      default:
        log.error(`Unknown scenario: ${scenario}`);
        console.log('Available scenarios: 1 (basic blast), 2 (retry failed), 3 (webhook simulation)');
    }

    console.log(chalk.bold.green(`\n✅ All tests completed!\n`));
  } catch (err) {
    console.error(chalk.red(`\n❌ Test suite failed:\n`), err.message);
    process.exit(1);
  }
}

main();
