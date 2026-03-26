import React from 'react'
import './Footer.scss'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <span className="footer-brand">LocaPick</span>
        <p className="footer-copy">© {new Date().getFullYear()} LocaPick. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
