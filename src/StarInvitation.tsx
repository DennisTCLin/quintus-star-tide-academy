/** Code-drawn ticket stays crisp at every size and needs no image download. */
export function StarInvitation({ balance }: { balance: number }) {
  return <div className="star-invitation">
    <div className="star-invitation-seal" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1"/><circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeDasharray="2 5"/><path d="M50 8 60 35 89 36 67 55 74 84 50 68 26 84 33 55 11 36 40 35Z" fill="currentColor"/><text x="50" y="59" textAnchor="middle" fill="#132d45" fontFamily="Georgia,serif" fontWeight="bold" fontSize="31">S</text></svg></div>
    <div className="star-invitation-copy"><span>管理員特別贈送</span><strong>星耀特邀券</strong><span>S 級 30% · A 級 70%</span></div>
    <div className="star-invitation-stub"><strong>{balance}</strong><span>張</span></div>
  </div>;
}
