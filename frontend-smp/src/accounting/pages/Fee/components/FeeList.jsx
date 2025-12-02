import { predefinedAdmissionFees, predefinedExamFees } from '../FeeHeadsConstants';

const FeeList = ({ feeHeads, onQuickAdd, onEdit, onQuickEdit }) => {
  const admissionFees = feeHeads.filter(f => f.category === "admission");
  const examFees = feeHeads.filter(f => f.category === "exam");

  const totalAdmission = admissionFees.reduce((sum, f) => sum + Number(f.amount), 0);
  const totalExam = examFees.reduce((sum, f) => sum + Number(f.amount), 0);

  const renderFeeSection = (fees, predefinedFees, category, bgColor, borderColor, textColor) => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
      <div className={`bg-gradient-to-r ${bgColor} p-6 border-b border-gray-200`}>
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <span className="text-2xl">{category === 'admission' ? '🎓' : '📝'}</span>
          {category === 'admission' ? 'Admission Fees Structure' : 'Examination Fees Structure'}
        </h3>
        <p className={`${textColor} text-base mt-1`}>
          Based on {category === 'admission' ? 'institutional' : 'university'} fee receipt - Click amount to edit
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predefinedFees.map((feeTemplate, idx) => {
            const existingFee = fees.find(f => f.title === feeTemplate.title);
            const currentAmount = existingFee ? existingFee.amount : 0;

            return (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-800 truncate">
                    {feeTemplate.title}
                  </h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onQuickAdd(feeTemplate, category)}
                      className="text-blue-600 hover:text-blue-800 text-xs p-1"
                      title="Add to form"
                    >
                      ➕
                    </button>
                    {existingFee && (
                      <button
                        onClick={() => onEdit(existingFee)}
                        className="text-green-600 hover:text-green-800 text-xs p-1"
                        title="Edit"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">₹</span>
                  <input
                    type="number"
                    className="flex-1 text-lg font-bold text-green-700 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                    value={currentAmount}
                    onChange={(e) => {
                      if (e.target.value) {
                        onQuickEdit(feeTemplate, category, e.target.value);
                      }
                    }}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  {existingFee ? (
                    <span className="text-green-600">✓ Active</span>
                  ) : (
                    <span className="text-gray-400">Not set</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {fees.length > 0 && (
          <div className={`mt-6 ${category === 'admission' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'} rounded-lg p-4 border`}>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-800">
                Total {category === 'admission' ? 'Admission' : 'Examination'} Fees:
              </span>
              <span className="text-2xl font-bold text-green-700">
                ₹{category === 'admission' ? totalAdmission.toLocaleString() : totalExam.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {fees.length} active fee head{fees.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {renderFeeSection(admissionFees, predefinedAdmissionFees, 'admission', 'from-blue-600 to-indigo-600', 'border-blue-300', 'text-blue-100')}
      {renderFeeSection(examFees, predefinedExamFees, 'exam', 'from-purple-600 to-pink-600', 'border-purple-300', 'text-purple-100')}
    </>
  );
};

export default FeeList;