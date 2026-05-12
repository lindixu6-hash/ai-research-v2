/**
 * 按钮组件 - 基于 DESIGN.md 规范
 * 支持主按钮和次级按钮
 */
import { motion } from 'framer-motion';
import clsx from 'clsx';

export function Button({ variant = 'primary', size = 'md', children, disabled, ...props }) {
  return (
    <motion.button
      className={clsx(
        'btn',
        `btn-${variant}`,
        `btn-${size}`
      )}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
