const asyncHandler = require('../utils/asyncHandler');
const smsLogModel = require('../models/smsLogModel');

const listSmsLogs = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const logs = await smsLogModel.listAll({ status });
  res.json({ logs });
});

module.exports = { listSmsLogs };
