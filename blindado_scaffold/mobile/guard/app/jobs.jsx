import { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { api } from '../lib/api';

const GUARD_ID = "REPLACE-GUARD-ID";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);

  async function load() {
    try {
      const r = await api(`/jobs/list?guard_id=${GUARD_ID}`, 'GET');
      setJobs(r.jobs || []);
    } catch(e) { alert('Error: '+e.message); }
  }
  useEffect(()=>{ load(); },[]);

  async function accept(id) {
    try {
      await api(`/jobs/accept`, 'POST', { assignment_id: id });
      await load();
      alert('Aceptado');
    } catch(e) { alert('Error: '+e.message); }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Ofertas</Text>
      <FlatList
        data={jobs}
        keyExtractor={(item)=>item.id}
        renderItem={({item}) => (
          <View style={s.card}>
            <Text style={s.txt}>Booking: {item.booking_id}</Text>
            <Button title="Aceptar" onPress={()=>accept(item.id)} />
          </View>
        )}
      />
    </View>
  );
}
const s = StyleSheet.create({
  wrap:{ flex:1, padding:20, backgroundColor:'#0B0B0F' },
  h1:{ color:'#fff', fontSize:22, marginBottom:12 },
  card:{ backgroundColor:'#121216', padding:12, borderRadius:8, marginBottom:10 },
  txt:{ color:'#fff', marginBottom:8 }
});
