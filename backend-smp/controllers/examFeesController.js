import ExamFee from '../models/ExamFee.js';

export const getExamFees = async (req, res) => {
  try {
    const { stream, branch, semester } = req.query;

    let query = {};
    if (stream) query.stream = stream;
    if (branch) query.branch = branch;
    if (semester) query.semester = semester;

    const fees = await ExamFee.find(query);
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExamFee = async (req, res) => {
  try {
    const { stream, branch, semester, head, amount } = req.body;
    const fee = await ExamFee.findOneAndUpdate(
      { stream, branch, semester, head },
      { amount },
      { new: true, upsert: true }
    );
    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};