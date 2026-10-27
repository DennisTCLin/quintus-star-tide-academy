import './starter-onboarding.css';
export default function CapsuleMachine() {
  return <div className="star-capsule-machine" aria-hidden="true">
    <div className="capsule-globe"><span className="globe-star">✦</span>{Array.from({ length: 7 }, (_, i) => <i key={i} className={`mini-capsule capsule-${i}`} />)}</div>
    <div className="capsule-base"><div className="capsule-dial"><i /></div><div className="capsule-chute"><i /></div></div>
  </div>;
}
