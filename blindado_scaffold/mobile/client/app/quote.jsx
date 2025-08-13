import { useState } from 'react';
import { View, Text, TextInput, Switch, Button, StyleSheet } from 'react-native';
import { api } from '../lib/api';

export default function Quote() {
  const [city, setCity] = useState('CDMX');
  const [armed, setArmed] = useState(false);
  const [vehicle, setVehicle] = useState(false);
  const [vehicleType, setVehicleType] = useState('suv');
  const [start, setStart] = useState(new Date().toISOString());
  const [end, setEnd] = useState(new Date(Date.now()+4*3600*1000).toISOString());
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  const getQuote = async () => {
    setLoading(true);
    try {
      const r = await api('/pricing','POST',{ city, tier:'direct', armed_required: armed, vehicle_required: vehicle, vehicle_type: vehicleType, start_ts:start, end_ts:end });
      setQuote(r);
    } catch (e) {
      alert('Error: '+e.message);
    } finally { setLoading(false); }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Cotizar</Text>
      <TextInput style={s.input} value={city} onChangeText={setCity} placeholder="Ciudad" placeholderTextColor="#888"/>
      <View style={s.row}><Text style={s.lbl}>Armas</Text><Switch value={armed} onValueChange={setArmed}/></View>
      <View style={s.row}><Text style={s.lbl}>Vehículo</Text><Switch value={vehicle} onValueChange={setVehicle}/></View>
      {vehicle && <TextInput style={s.input} value={vehicleType} onChangeText={setVehicleType} placeholder="suv | armored_suv" placeholderTextColor="#888"/>}
      <Button title={loading ? "Cotizando..." : "Obtener cotización"} onPress={getQuote} />
      {quote && <View style={s.card}><Text style={s.price}>${quote.quote_amount} {quote.currency}</Text><Text>Mínimo: {quote.min_hours}h</Text></View>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap:{ flex:1, padding:20, backgroundColor:'#0B0B0F' },
  h1:{ color:'#fff', fontSize:22, marginBottom:16 },
  input:{ backgroundColor:'#1a1a1e', color:'#fff', padding:12, borderRadius:8, marginBottom:12 },
  row:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  lbl:{ color:'#fff' },
  card:{ marginTop:16, padding:16, backgroundColor:'#121216', borderRadius:10 },
  price:{ color:'#fff', fontSize:20, marginBottom:6 }
});
