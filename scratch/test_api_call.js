async function test() {
  try {
    const doctorId = "6a2a814c59478c852f2a5683";
    console.log(`Calling production API for doctorId: ${doctorId}...`);
    const rxRes = await fetch(`https://new-life-clinic.onrender.com/api/prescriptions?doctorId=${doctorId}`);
    console.log('Production API response status:', rxRes.status);
    const rxData = await rxRes.json();
    console.log('Production API prescription count:', rxData.length);
    console.log('Production API prescriptions:', JSON.stringify(rxData, null, 2));
  } catch (e) {
    console.error('API call failed:', e);
  }
}

test();
