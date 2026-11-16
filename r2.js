(async()=>{window.__err=[];addEventListener('error',e=>__err.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__err.push('rej '+(e.reason&&(e.reason.stack||e.reason.message)||e.reason)));
const sl=ms=>new Promise(r=>setTimeout(r,ms));show('tour');tourHost();await sl(5000);tourGo();await sl(3500);
window.__rd=(async()=>{for(let n=0;n<900;n++){await sl(1200);if(TOUR.phase==='end')break;if(!G||!G.prep||TOUR.phase!=='prep'||TOUR.ready)continue;
 for(let k=0;k<5;k++){const b=document.querySelector('[data-buy="'+k+'"]:not(.no)');b&&b.click()}
 for(let i=0;i<4;i++){if(TOUR.bench[i]){const f=TOUR.board.indexOf(null);if(f>=0){rMove('bench',i);rMove('board',f)}}}
 if(window.__hold){continue}await sl(1500);document.querySelector('#rReady').click()}})();
window.__hold=1;await sl(4000);return JSON.stringify({V:typeof V,round:TOUR.round,phase:TOUR.phase,prep:G&&G.prep,gold:TOUR.gold,board:TOUR.board.map(u=>u&&u.id),err:__err})})()
