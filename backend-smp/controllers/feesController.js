import FeeHead from '../models/FeeHead.js';

export const getFees = async (req, res) => {
  try {
    const { stream, branch, batch } = req.query;
    if (!stream || !branch) {
      return res.status(400).json({ message: 'stream and branch are required' });
    }
    const query = { stream, branch };
    if (batch) {
      query.batch = batch;
    }
    const fees = await FeeHead.find(query);
    res.json(fees);
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateFee = async (req, res) => {
  try {
    const { stream, branch, batch, head, amount } = req.body;
    if (!stream || !branch || !batch || !head || amount === undefined || amount === null) {
      return res.status(400).json({ message: 'All fields are required and amount must be provided' });
    }
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: 'Amount must be a valid non-negative number' });
    }
    const fee = await FeeHead.findOneAndUpdate(
      { stream, branch, batch, head },
      { amount: Number(amount) },
      { new: true, upsert: true }
    );
    res.json(fee);
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ message: 'Server error' });
  }
};