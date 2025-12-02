import FeeHead from '../models/FeeHead.js';

export const getFees = async (req, res) => {
  try {
    const { stream, branch, batch } = req.query;
    if (!stream || !branch || !batch) {
      return res.status(400).json({ message: 'stream, branch, and batch are required' });
    }
    const fees = await FeeHead.find({ stream, branch, batch });
    res.json(fees);
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateFee = async (req, res) => {
  try {
    const { stream, branch, batch, head, amount } = req.body;
    if (!stream || !branch || !batch || !head || amount === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const fee = await FeeHead.findOneAndUpdate(
      { stream, branch, batch, head },
      { amount },
      { new: true, upsert: true }
    );
    res.json(fee);
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ message: 'Server error' });
  }
};