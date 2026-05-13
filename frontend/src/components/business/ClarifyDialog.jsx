/**
 * 澄清对话框组件
 * 功能：处理问题澄清，支持多选
 */
import { useState } from 'react';
import { motion } from 'framer-motion';

export function ClarifyDialog({ question, options, onConfirm, onSkip, onCancel }) {
  const [selected, setSelected] = useState([]);

  const toggleOption = (option) => {
    setSelected(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const handleConfirm = () => {
    if (selected.length > 0) {
      onConfirm(selected);
    }
  };

  return (
    <motion.div
      className="clarify-box"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <h3>💭 {question}</h3>
      <p className="clarify-subtitle">可多选，或跳过直接搜索</p>

      <div className="clarify-options">
        {options?.map((option, i) => (
          <motion.button
            key={i}
            className={`clarify-option ${selected.includes(option) ? 'selected' : ''}`}
            onClick={() => toggleOption(option)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="checkbox-icon">
              {selected.includes(option) ? '☑️' : '⬜'}
            </span>
            {option}
          </motion.button>
        ))}
      </div>

      <div className="clarify-actions">
        <button
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className="confirm-button"
        >
          确认选择 {selected.length > 0 && `(${selected.length})`}
        </button>
        <button onClick={onSkip} className="skip-button">
          跳过
        </button>
        <button onClick={onCancel} className="cancel-button">
          取消
        </button>
      </div>
    </motion.div>
  );
}
