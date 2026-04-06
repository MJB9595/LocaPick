import React from 'react'
import './Button.scss'

const Button = ({
  text,
  className,
  type,
  onClick,
  icons}) => {
  return (
    <button onClick={onClick} className={`btn ${className}`}>
      {text}
      {icons && <img src='/images/arrow.svg'/>}
    </button>
  )
}

export default Button
