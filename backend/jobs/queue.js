// Example BullMQ setup
const { Queue, Worker } = require('bullmq');
const config = require('../config');

const myQueue = new Queue('default', { connection: { url: config.redisUrl } });

// sample worker
const worker = new Worker('default', async job => {
  // process job.data
}, { connection: { url: config.redisUrl } });

module.exports = { myQueue, worker };
