import React from 'react'
import './Input.scss'

/**
 * 재사용 Input 컴포넌트
 * @param {string}   label       - 라벨 텍스트
 * @param {string}   id          - input id (label htmlFor 연결)
 * @param {string}   type        - input type (default: 'text')
 * @param {string}   placeholder
 * @param {string}   value
 * @param {function} onChange
 * @param {string}   error       - 에러 메시지
 * @param {boolean}  required
 */
const Input = ({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  ...rest
}) => {
  return (
    <div className={`ui-input-wrap ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={id} className="ui-input-label">
          {label}
          {required && <span className="ui-input-required"> *</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="ui-input"
        aria-invalid={!!error}
        {...rest}
      />
      {error && <p className="ui-input-error">{error}</p>}
    </div>
  )
}

export default Input
