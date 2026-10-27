/** Equal sectors rearrange into an increasingly rectangular strip. */
export function CircleAreaDiagram({radius,step}:{radius:number;step:number}) {
  const count=12,r=62,half=r*Math.sin(Math.PI/count),height=r*Math.cos(Math.PI/count);
  const path='M0 0 L'+(-half)+' '+height+' A'+r+' '+r+' 0 0 0 '+half+' '+height+' Z';
  return <svg className="isl-math-svg" viewBox="0 0 340 235" role="img" aria-label={'半徑 '+radius+' 的圓，分成十二個相同扇形再交錯排列'}>
    {Array.from({length:count},(_,i)=><path key={i} d={path} fill={i%2?'#e8b06e':'#83c5c5'} stroke="#173e50" strokeWidth="1"
      style={{transform:step<2?'translate(170px,102px) rotate('+i*360/count+'deg)':'translate('+(72+i*half)+'px,'+(75+(i%2?height:0))+'px) rotate('+(i%2?180:0)+'deg)',transition:'transform .7s ease'}}/>)}
    {step<2?<><line x1="170" y1="102" x2={170+r} y2="102" stroke="#cc683c" strokeWidth="3"/><text x="203" y="96" fill="#173e50">半徑 {radius}</text><text x="170" y="200" textAnchor="middle" fill="#173e50">分成一樣大的小扇形</text></>:<>
      <text x="170" y="170" textAnchor="middle" fill="#173e50">長接近半個圓周，高接近半徑</text>
      <text x="170" y="205" textAnchor="middle" fill="#173e50">越切越細，越接近長方形</text>
    </>}
  </svg>;
}
