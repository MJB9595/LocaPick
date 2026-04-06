import React from 'react'
import { NavLink } from 'react-router-dom'   // ← Navlink → NavLink 수정
import Button from '../../components/ui/Button'
import './Landing.scss'

const Landing = () => {
  return (
    <section className="landing app-bg">
      <div className="inner">
        <div className="t-wrap">
          <img src="/images/landing-img.png" alt="img" />
          <h2>
            <img src="/images/logo.png" alt="logo" />
          </h2>
          <p>장소 정하기 어려울땐? - LocaPick</p>
        </div>

        <div className="landing-actions">
          <NavLink to="/login">
            <Button text="시작하기" className="intro" type="intro" icons={true} />
          </NavLink>
        </div>
      </div>
    </section>
  )
}

export default Landing
