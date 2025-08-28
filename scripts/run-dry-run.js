(async ()=>{
  try{
    const fetch = global.fetch || (await import('node-fetch')).default;
    const res = await fetch('http://localhost:3000/api/optimize/run-batch', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ scenario_id: 2 })
    });
    const txt = await res.text();
    console.log('STATUS', res.status);
    console.log(txt.slice(0, 10000));
  }catch(e){
    console.error('DRY-RUN ERROR', e);
    process.exit(1);
  }
})();
