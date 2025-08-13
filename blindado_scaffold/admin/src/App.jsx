import React, { useEffect } from 'react'
import L from 'leaflet'

export default function App(){
  useEffect(()=>{
    const map = L.map('map').setView([19.4326, -99.1332], 12); // CDMX
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Mock data: guards & bookings
    const guards = [
      { id:'g1', name:'Guardia 1', lat:19.44, lng:-99.14, armed:true },
      { id:'g2', name:'Guardia 2', lat:19.41, lng:-99.11, armed:false },
    ];
    const bookings = [
      { id:'b1', city:'CDMX', status:'matching', lat:19.435, lng:-99.16 },
      { id:'b2', city:'CDMX', status:'assigned', lat:19.428, lng:-99.12 },
    ];

    guards.forEach(g=> {
      L.marker([g.lat,g.lng]).addTo(map).bindPopup(`${g.name} ${g.armed ? '🔒' : ''}`);
    });
    bookings.forEach(b=> {
      L.circleMarker([b.lat,b.lng], { radius:8 }).addTo(map).bindPopup(`Booking ${b.id} — ${b.status}`);
    });
  },[]);

  return (
    <div className="row">
      <div className="sidebar">
        <h2>Blindado — Dispatch</h2>
        <div className="card"><b>Live</b> <span className="badge">CDMX</span></div>
        <div className="card">
          <b>Bookings</b>
          <ul>
            <li>b1 — matching</li>
            <li>b2 — assigned</li>
          </ul>
        </div>
        <div className="card">
          <b>Guards</b>
          <ul>
            <li>Guardia 1 — online</li>
            <li>Guardia 2 — online</li>
          </ul>
        </div>
      </div>
      <div id="map" className="map" />
    </div>
  )
}
